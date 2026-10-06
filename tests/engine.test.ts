import { describe, expect, it } from "vitest";
import {
  computeDerived,
  computeComplexity,
  checkConsistency,
  evalCondition,
  evaluateFlags,
  renderTemplate,
  addressLine,
  money,
} from "../src/lib/engine";
import type { Answers } from "../src/lib/types";

const base: Answers = {
  maritalStatus: "married",
  dob: "1980-01-01",
  children: [
    { name: "Kid A", dob: "2015-05-01", relationship: "child", previousRelationship: true },
    { name: "Kid B", dob: "2000-05-01", relationship: "child", previousRelationship: false },
  ],
  assetTypes: ["home", "business"],
  estateValue: "2m_5m",
};

describe("mini json-logic evaluator", () => {
  it("supports ==, !=, in, comparisons", () => {
    expect(evalCondition({ "==": [{ var: "maritalStatus" }, "married"] }, base)).toBe(true);
    expect(evalCondition({ "!=": [{ var: "maritalStatus" }, "single"] }, base)).toBe(true);
    expect(evalCondition({ in: [{ var: "estateValue" }, ["2m_5m", "over_5m"]] }, base)).toBe(true);
    expect(evalCondition({ in: ["business", { var: "answers.assetTypes" }] }, base)).toBe(true);
    expect(evalCondition({ ">": [{ var: "derived.childCount" }, 1] }, base)).toBe(true);
  });

  it("supports and/or/not and truthy", () => {
    expect(
      evalCondition(
        { and: [{ "==": [{ var: "maritalStatus" }, "married"] }, { truthy: [{ var: "estateValue" }] }] },
        base
      )
    ).toBe(true);
    expect(evalCondition({ or: [{ "==": [{ var: "x" }, 1] }, { "==": [{ var: "maritalStatus" }, "married"] }] }, base)).toBe(true);
    expect(evalCondition({ not: { "==": [{ var: "maritalStatus" }, "single"] } }, base)).toBe(true);
  });

  it("treats null conditions as true", () => {
    expect(evalCondition(null, base)).toBe(true);
  });
});

describe("derived facts", () => {
  it("detects minor children, counts children, blended families", () => {
    const d = computeDerived(base);
    expect(d.hasMinorChildren).toBe(true);
    expect(d.childCount).toBe(2);
    expect(d.blendedFamily).toBe(true); // married + child from previous relationship
    expect(d.partneredNow).toBe(true);
  });

  it("blended family requires both partner and previous-relationship child", () => {
    const d = computeDerived({ ...base, maritalStatus: "divorced" });
    expect(d.blendedFamily).toBe(false);
  });
});

describe("triage flags", () => {
  it("raises blended family, large estate, structures and minor flags together", () => {
    const ids = evaluateFlags(base).map((f) => f.id);
    expect(ids).toContain("FAM_BLENDED");
    expect(ids).toContain("EST_LARGE");
    expect(ids).toContain("STRUCT_BUSINESS");
    expect(ids).toContain("BEN_MINOR");
  });

  it("raises the advisory flag when a client is unsure on a structural question", () => {
    const flags = evaluateFlags({ dob: "1990-01-01", superNomination: "unsure", maritalStatus: "single" });
    expect(flags.map((f) => f.id)).toContain("ANS_UNSURE_STRUCTURAL");
  });

  it("raises capacity flag for 85+", () => {
    expect(evaluateFlags({ dob: "1930-01-01" }).map((f) => f.id)).toContain("CAP_AGE");
  });

  it("carries client vs lawyer messaging and routing on every flag", () => {
    const flags = evaluateFlags({ ...base, excludingAnyone: "yes" });
    const excluded = flags.find((f) => f.id === "FP_DISINHERIT_OTHER")!;
    expect(excluded.severity).toBe("high");
    expect(excluded.routing).toBe("senior-lawyer");
    expect(excluded.blocksAutoApproval).toBe(true);
    // Client copy must stay reassuring, never alarming
    expect(excluded.clientMessage).toMatch(/lawyer will talk this through/i);
    expect(excluded.lawyerMessage).toMatch(/Part 4|provision/i);
    for (const f of flags) {
      expect(f.clientMessage.length).toBeGreaterThan(10);
      expect(f.lawyerMessage.length).toBeGreaterThan(10);
      expect(f.category.length).toBeGreaterThan(2);
    }
  });
});

describe("complexity score and routing", () => {
  it("scores a simple matter as straightforward and routes to the lawyer queue", () => {
    const flags = evaluateFlags({ dob: "1990-01-01", maritalStatus: "single", hasChildren: "no" });
    const c = computeComplexity(flags);
    expect(c.band).toBe("straightforward");
    expect(c.routing).toBe("lawyer");
    expect(c.blocked).toBe(false);
  });

  it("escalates high-severity matters to the senior lawyer", () => {
    const c = computeComplexity(evaluateFlags(base));
    expect(c.score).toBeGreaterThan(4);
    expect(c.routing).toBe("senior-lawyer");
    expect(c.label).toBe("Complex");
  });

  it("blocks the online path when a blocker fires", () => {
    const underage = computeComplexity(evaluateFlags({ dob: "1980-01-01", executorIssues: ["under18"] }));
    expect(underage.blocked).toBe(true);
    expect(underage.blockers.map((b) => b.id)).toContain("EXEC_UNDER18");

    const influence = computeComplexity(
      evaluateFlags({ dob: "1940-01-01", hasHelper: "yes", helperName: "Rob", helperIsBeneficiary: "yes" })
    );
    expect(influence.blocked).toBe(true);
    expect(influence.blockers.map((b) => b.id)).toContain("CAP_UNDUE_INFLUENCE");
  });
});

describe("consistency checker", () => {
  it("finds contradictions with jump-to-fix targets", () => {
    const issues = checkConsistency({
      hasChildren: "no",
      guardianName: "Sam Lee",
      residueStructure: "split_children",
      hasPets: "no",
      petAmount: 5000,
    });
    const ids = issues.map((i) => i.id);
    expect(ids).toContain("CHK_NO_CHILDREN_BUT_GUARDIAN");
    expect(ids).toContain("CHK_SPLIT_CHILDREN_NO_CHILDREN");
    expect(ids).toContain("CHK_PETS_NO_PETS");
    for (const i of issues) {
      expect(i.step).toBeTruthy();
      expect(i.questionId).toBeTruthy();
    }
  });

  it("passes clean answers", () => {
    expect(checkConsistency({ hasChildren: "no", hasPets: "no", residueStructure: "all_partner", maritalStatus: "married" })).toHaveLength(0);
  });

  it("detects shares that do not total 100%", () => {
    const issues = checkConsistency({
      residueStructure: "named",
      residueBeneficiaries: [{ name: "A", share: 60 }, { name: "B", share: 30 }],
    });
    expect(issues.map((i) => i.id)).toContain("CHK_SHARES_NOT_100");
  });
});

describe("template rendering", () => {
  it("renders variables, addresses and truthy sections", () => {
    const out = renderTemplate("I APPOINT {{executorName}} of {{addr}}{{#backup}}, or {{backup}}{{/backup}}.", {
      executorName: "Kate",
      addr: addressLine({ street: "1 St", suburb: "Wynnum", state: "QLD", postcode: "4178" }),
      backup: "Peter",
    });
    expect(out).toBe("I APPOINT Kate of 1 St, Wynnum, QLD, 4178, or Peter.");
  });

  it("hides falsy sections and blanks missing vars", () => {
    expect(renderTemplate("A{{#x}}B{{/x}}C", { x: "" })).toBe("AC");
    expect(renderTemplate("A {{missing}} B", {})).toBe("A  B");
  });
});

describe("money", () => {
  it("formats AUD", () => {
    expect(money(349)).toContain("349");
  });
});
