// Brain180 v2 schema — owner: ALI-62 차곡담[자료]
//
// 본 파일은 *seam* 만 정의. 실제 22 엔티티 (User, OAuthAccount, Session,
// EmailToken, Plan, Subscription, Payment, Module, Lesson, TextExcerpt,
// Enrollment, LearningSession, CanvasArtifact, CanvasExport,
// TutorSystemPrompt, TutorMessage, TutorRating, SessionEvaluation,
// GrowthReport, Notification, ReminderRule, GroupClass, APIUsageLog) 는
// ALI-62 가 본 파일을 확장하여 채운다.
//
// MVP cut (docs/decisions.md §1):
//   유지: User, Session, EmailToken, Module, Lesson, TextExcerpt,
//         LearningSession, CanvasArtifact, TutorSystemPrompt, TutorMessage,
//         TutorRating, APIUsageLog
//   컷:   Plan, Subscription, Payment, OAuthAccount, Enrollment,
//         CanvasExport, SessionEvaluation, GrowthReport, Notification,
//         ReminderRule, GroupClass  (스키마 컬럼만 향후 마이그레이션)

export const SCHEMA_OWNER = "ALI-62" as const;
