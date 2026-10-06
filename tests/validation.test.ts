import { describe, expect, it } from "vitest";
import { validateQuestion, validateAll, sectionCompletion, validateSection, allHardStops } from "../src/lib/validation";
import { getSections, type QuestionField } from "../src/lib/config";
import { stepInfo, questionPath } from "../src/lib/steps";
import { USERS } from "../src/lib/seed";

describe("question validators", () => {
  it("requires answers and enforces formats", () => {
    const name: QuestionField = { id: "fullName", type: "text", label: "Full legal name", required: true, minLength: 2 };
    expect(validateQuestion(name, "")).toMatch(/required/);
    expect(validateQuestion(name, "A")).toMatch(/at least 2/);
    expect(validateQuestion(name, "Ava Nguyen")).toBeNull();
  });

  it("validates Australian phone numbers", () => {
    const phone: QuestionField = { id: "phone", type: "tel", label: "Mobile", required: true };
    expect(validateQuestion(phone, "0412 345 678")).toBeNull();
    expect(validateQuestion(phone, "hello")).toMatch(/Australian phone/);
  });

  it("blocks minors from making a will", () => {
    const dob: QuestionField = { id: "dob", type: "date", label: "Date of birth", required: true, mustBeAdult: true };
    const under18 = new Date();
    under18.setFullYear(under18.getFullYear() - 10);
    expect(validateQuestion(dob, under18.toISOString().slice(0, 10))).toMatch(/18/);
    expect(validateQuestion(dob, "1990-01-01")).toBeNull();
  });

  it("consents must be ticked", () => {
    const c: QuestionField = { id: "declarationTruth", type: "consent", label: "I declare…", required: true };
    expect(validateQuestion(c, false)).toMatch(/tick/);
    expect(validateQuestion(c, true)).toBeNull();
  });

  it("repeaters enforce required fields and share totals", () => {
    const rep: QuestionField = {
      id: "residueShares",
      type: "repeater",
      label: "Shares",
      required: true,
      minItems: 1,
      mustTotal: 100,
      totalField: "share",
      fields: [
        { id: "name", type: "text", label: "Beneficiary name", required: true },
        { id: "share", type: "number", label: "Share (%)", required: true },
      ],
    };
    expect(validateQuestion(rep, [{ name: "Kate", share: 60 }])).toMatch(/100/);
    expect(validateQuestion(rep, [{ name: "", share: 100 }])).toMatch(/Item 1/);
    expect(validateQuestion(rep, [{ name: "Kate", share: 60 }, { name: "Sam", share: 40 }])).toBeNull();
  });
});

describe("whole-questionnaire validation", () => {
  it("an empty draft fails validation with a first failing section", () => {
    const { errors, firstSectionId } = validateAll(getSections(), {});
    expect(Object.keys(errors).length).toBeGreaterThan(10);
    expect(firstSectionId).toBe("about");
  });

  it("guardians section is skipped when there are no minor children", () => {
    const sections = getSections();
    const guardians = sections.find((s) => s.id === "guardians")!;
    const errorsNoKids = validateSection(guardians, { hasChildren: "no" });
    expect(Object.keys(errorsNoKids)).toHaveLength(0); // section hidden — nothing required
  });

  it("completion percentage reflects progress", () => {
    const sections = getSections();
    expect(sectionCompletion(sections, {})).toBe(0);
    const partial = sectionCompletion(sections, { fullName: "A N" });
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(10);
  });
});

describe("hard stops and step status", () => {
  it("an executor under 18 is a hard stop, not just a flag", () => {
    const q: QuestionField = { id: "executorIssues", type: "checkboxes", label: "Executor issues", required: false };
    expect(validateQuestion(q, ["none"])).toBeNull();
    expect(validateQuestion(q, ["overseas"])).toBeNull(); // allowed, flagged only
    expect(validateQuestion(q, ["under18"])).toMatch(/cannot legally act/);
    expect(allHardStops({ executorIssues: ["under18"] })).toHaveLength(1);
    expect(allHardStops({ executorIssues: ["bankrupt"] })).toHaveLength(0);
  });

  it("validates the executor repeater including the over-18 confirmation", () => {
    const execs = getSections().find((s) => s.id === "executors")!.questions.find((q) => q.id === "executors")!;
    expect(validateQuestion(execs, [{ name: "Kate", relationship: "spouse", address: "1 St", phone: "0400000000", over18: true }])).toBeNull();
    expect(validateQuestion(execs, [{ name: "Kate", relationship: "spouse", address: "1 St", phone: "0400000000" }])).toMatch(/confirmed|Item 1/);
  });

  it("marks a skipped step as skipped, and hidden steps as not needed", () => {
    const sections = getSections();
    const gifts = sections.find((s) => s.id === "gifts")!;
    const guardians = sections.find((s) => s.id === "guardians")!;
    expect(stepInfo(gifts, { hasSpecificGifts: "no" }, []).status).toBe("skipped");
    expect(stepInfo(guardians, { hasChildren: "no" }, []).status).toBe("not_needed");
  });

  it("builds a seven-step journey with real-path question ordering", () => {
    const sections = getSections();
    expect(sections.map((s) => s.id)).toEqual([
      "about", "guardians", "pets", "executors", "divide", "gifts", "funeral",
    ]);
    // No children => guardians step disappears from the question path entirely
    const path = questionPath(sections, { hasChildren: "no", hasPets: "no" });
    expect(path.some((p) => p.section.id === "guardians")).toBe(false);
    expect(path.some((p) => p.question.id === "pets")).toBe(false);
  });
});

describe("seed integrity", () => {
  it("seeds exactly 1 admin, 1 senior lawyer, 2 lawyers, 8+ clients, 1 observer", () => {
    const count = (role: string) => USERS.filter((u) => u.role === role).length;
    expect(count("admin")).toBe(1);
    expect(count("senior_lawyer")).toBe(1);
    expect(count("lawyer")).toBe(2);
    expect(count("client")).toBeGreaterThanOrEqual(8);
    expect(count("observer")).toBe(1);
  });
});
