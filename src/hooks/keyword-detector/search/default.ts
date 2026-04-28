/**
 * Search mode keyword detector.
 *
 * Triggers on search-related keywords across multiple languages:
 * - English: search, locate, lookup, look up, explore, discover, scan, grep, query, browse, detect, trace
 * - Korean: 검색, 탐색, 조회, 스캔, 서치, 뒤져, 찾기, 추적, 탐지, 찾아봐, 찾아내, 목록
 * - Japanese: 検索, 探して, 見つけて, サーチ, 探索, スキャン, 発見, 捜索, 見つけ出す, 一覧
 * - Chinese: 搜索, 查找, 寻找, 查询, 检索, 定位, 扫描, 发现, 找出来, 列出
 * - Vietnamese: tìm kiếm, tra cứu, định vị, quét, phát hiện, truy tìm, tìm ra, liệt kê
 */

export const SEARCH_PATTERN =
  /\b(search|locate|lookup|look\s*up|explore|discover|scan|grep|query|browse|detect|trace)\b|검색|탐색|조회|스캔|서치|뒤져|찾기|추적|탐지|찾아봐|찾아내|목록|検索|探して|見つけて|サーチ|探索|スキャン|発見|捜索|見つけ出す|一覧|搜索|查找|寻找|查询|检索|定位|扫描|发现|找出来|列出|tìm kiếm|tra cứu|định vị|quét|phát hiện|truy tìm|tìm ra|liệt kê/i

export const SEARCH_MESSAGE = `[search-mode]
MAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL:
- explore agents (codebase patterns, file structures, ast-grep)
- librarian agents (remote repos, official docs, GitHub examples)
Plus direct tools: Grep, ripgrep (rg), ast-grep (sg)
NEVER stop at first result - be exhaustive.`
