/**
 * Analyze mode keyword detector.
 *
 * Triggers on analysis-related keywords across multiple languages:
 * - English: analyze, analyse, investigate, examine, audit, diagnose, scrutinize, dissect, breakdown, deep-dive, evaluate, assess, review, inspect, research, study, debug, comprehend, interpret
 * - Korean: 분석, 조사, 파악, 연구, 검토, 진단, 평가, 해석, 디버깅, 디버그, 뜯어봐, 따져봐, 살펴
 * - Japanese: 分析, 調査, 解析, 検討, 研究, 診断, 検証, 精査, 究明, デバッグ, 仕組み
 * - Chinese: 分析, 调查, 检查, 剖析, 深入, 诊断, 调试, 原理, 搞清楚, 弄明白
 * - Vietnamese: phân tích, điều tra, nghiên cứu, kiểm tra, xem xét, chẩn đoán, giải thích, tìm hiểu, gỡ lỗi
 */

export const ANALYZE_PATTERN =
  /\b(analyze|analyse|investigate|examine|audit|diagnose|scrutinize|dissect|breakdown|deep[\s-]?dive|evaluate|assess|review|inspect|research|study|debug|comprehend|interpret)\b|분석|조사|파악|연구|검토|진단|평가|해석|디버깅|디버그|뜯어봐|따져봐|살펴|分析|調査|解析|検討|研究|診断|検証|精査|究明|デバッグ|仕組み|调查|检查|剖析|深入|诊断|调试|原理|搞清楚|弄明白|phân tích|điều tra|nghiên cứu|kiểm tra|xem xét|chẩn đoán|giải thích|tìm hiểu|gỡ lỗi/i

export const ANALYZE_MESSAGE = `[analyze-mode]
ANALYSIS MODE. Gather context before diving deep:

CONTEXT GATHERING (parallel):
- 1-2 explore agents (codebase patterns, implementations)
- 1-2 librarian agents (if external library involved)
- Direct tools: Grep, AST-grep, LSP for targeted searches

IF COMPLEX - DO NOT STRUGGLE ALONE. Consult specialists:
- **Oracle**: Conventional problems (architecture, debugging, complex logic)
- **Artistry**: Non-conventional problems (different approach needed)

SYNTHESIZE findings before proceeding.`
