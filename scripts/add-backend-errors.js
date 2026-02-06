/**
 * 백엔드 과거 트러블슈팅 항목을 Notion에 추가하는 스크립트
 */

import { addMultipleTroubleshooting } from './notion-logger.js';

// 백엔드 트러블슈팅 항목들 (날짜순 정렬)
const backendTroubleshootings = [
  // ============================================
  // 2026-01-26: CORS 설정 수정
  // ============================================
  {
    title: '[Backend] CORS 설정 - 프론트엔드 개발 서버 포트 추가',
    domain: 'Config',
    category: 'Spring Boot',
    date: '2026-01-26',
    severity: 'High',
    tags: ['설정 오류', '버그'],
    resolveTime: 10,
    description:
      '프론트엔드에서 Live Server의 다양한 포트(5500, 5501)를 사용하는데, CORS 설정에 일부 포트만 허용되어 있어서 특정 포트에서는 API 호출이 차단되는 문제가 발생했습니다.',
    solution:
      'WebConfig의 CORS 설정에 누락된 포트들을 추가했습니다. localhost와 127.0.0.1 모두에 대해 5500, 5501, 8000 포트를 모두 허용하도록 수정했습니다.',
    code: `// Before
.allowedOrigins(
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500"
)

// After
.allowedOrigins(
    "http://localhost:5500",      // Live Server 기본 포트
    "http://127.0.0.1:5500",
    "http://localhost:5501",      // 추가
    "http://127.0.0.1:5501",      // 추가
    "http://localhost:8000",
    "http://127.0.0.1:8000"
)`,
  },

  // ============================================
  // 2026-01-28: Header 이름 변경
  // ============================================
  {
    title: '[Backend] HTTP Header 이름 불일치 (X-Member-Id → Member-Id)',
    domain: 'Global',
    category: 'API 설계',
    date: '2026-01-28',
    severity: 'Critical',
    tags: ['버그'],
    resolveTime: 30,
    description:
      '백엔드에서 X-Member-Id 헤더를 사용했지만, 프론트엔드에서는 Member-Id 헤더를 전송하여 인증이 실패하는 문제가 발생했습니다. CommentController, CommentLikeController, PostLikeController 등 여러 컨트롤러에서 동일한 문제가 있었습니다.',
    solution:
      '모든 컨트롤러의 @RequestHeader 어노테이션에서 "X-Member-Id"를 "Member-Id"로 일괄 변경했습니다. 프론트엔드와 백엔드의 헤더 이름을 통일했습니다.',
    code: `// Before
@RequestHeader("X-Member-Id") Long memberId

// After
@RequestHeader("Member-Id") Long memberId

// 적용된 컨트롤러:
// - CommentController
// - CommentLikeController
// - PostLikeController`,
  },

  // ============================================
  // 2026-02-06: 서버 연결 오류 - CORS 재설정
  // ============================================
  {
    title: '[Backend] Spring Security와 CORS 설정 충돌',
    domain: 'Config',
    category: 'Spring Boot',
    date: '2026-02-06',
    severity: 'Critical',
    tags: ['설정 오류', '보안'],
    resolveTime: 90,
    description:
      'Spring Security를 추가한 후 기존 WebMvcConfigurer의 addCorsMappings 설정이 제대로 작동하지 않아서 프론트엔드에서 CORS 에러가 발생했습니다. OPTIONS preflight 요청이 401 Unauthorized로 차단되었습니다.',
    solution:
      'CORS 설정 방식을 변경했습니다.\n1. WebMvcConfigurer의 addCorsMappings 대신 CorsConfigurationSource Bean 사용\n2. SecurityConfig에서 이 Bean을 참조하도록 설정\n3. Spring Security의 CORS 필터가 먼저 실행되도록 구성\n\n이렇게 하면 Security 필터 체인에서 CORS 설정이 올바르게 적용됩니다.',
    code: `// Before: WebMvcConfigurer 방식
@Override
public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:5500")
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true);
}

// After: Bean 방식
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
}

// SecurityConfig.java에서 사용:
http.cors(cors -> cors.configurationSource(corsConfigurationSource()))`,
  },

  // ============================================
  // 2026-02-06: 프로필 이미지 저장 경로 수정
  // ============================================
  {
    title: '[Backend] 프로필 이미지와 게시글 이미지 저장 경로 충돌',
    domain: 'Member',
    category: '기타',
    date: '2026-02-06',
    severity: 'Medium',
    tags: ['버그'],
    resolveTime: 20,
    description:
      'application.yml에서 파일 업로드 경로가 ./uploads/post로 설정되어 있어서, 프로필 이미지도 게시글 이미지 폴더에 저장되는 문제가 있었습니다. 이로 인해 파일 관리가 어렵고, 프로필 이미지와 게시글 이미지를 구분할 수 없었습니다.',
    solution:
      'application.yml의 file.upload.dir을 ./uploads로 변경하고, FileStorageService에서 용도에 따라 하위 폴더(member, post)를 자동으로 생성하도록 수정했습니다.\n\n- 프로필 이미지: ./uploads/member/\n- 게시글 이미지: ./uploads/post/',
    code: `// application.yml
# Before
file:
  upload:
    dir: ./uploads/post

# After
file:
  upload:
    dir: ./uploads

// FileStorageService에서 하위 폴더 생성
public String saveFile(MultipartFile file, String subDir) {
    Path uploadPath = Paths.get(uploadDir, subDir);
    // member 또는 post 하위 폴더에 저장
}`,
  },
];

// 실행
console.log('🚀 백엔드 트러블슈팅 항목을 Notion에 추가합니다...\n');
console.log(`총 ${backendTroubleshootings.length}개 항목을 추가합니다.\n`);

const results = await addMultipleTroubleshooting(backendTroubleshootings);

// 결과 요약
const successCount = results.filter((r) => r.success).length;
const failCount = results.filter((r) => !r.success).length;

console.log('\n=== 결과 요약 ===');
console.log(`✅ 성공: ${successCount}개`);
console.log(`❌ 실패: ${failCount}개`);

if (failCount > 0) {
  console.log('\n실패한 항목:');
  results
    .filter((r) => !r.success)
    .forEach((r) => {
      console.log(`  - ${r.title}: ${r.error}`);
    });
}

console.log('\n✨ 완료!');
