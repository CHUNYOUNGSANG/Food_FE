/**
 * Notion 트러블슈팅 자동 기록 스크립트
 * 프론트엔드 프로젝트의 트러블슈팅 내용을 Notion 데이터베이스에 자동으로 기록합니다.
 */

// .env 파일에서 환경변수 로드
import * as fs from 'fs';
import * as path from 'path';

// .env 파일 파싱
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const NOTION_API_KEY = envVars.NOTION_API_KEY;
const NOTION_DATABASE_ID = envVars.NOTION_DATABASE_ID;
const NOTION_VERSION = '2022-06-28';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

/**
 * Notion API 호출 헬퍼
 */
async function notionRequest(endpoint, method = 'GET', body = null) {
  const url = `${NOTION_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * 트러블슈팅 항목을 Notion에 추가
 * @param {Object} troubleshooting - 트러블슈팅 정보
 * @param {string} troubleshooting.title - 제목
 * @param {string} troubleshooting.domain - 도메인 (Member, Post, Global, Config, 전체, Frontend)
 * @param {string} troubleshooting.category - 카테고리
 * @param {string} troubleshooting.date - 발생일 (YYYY-MM-DD)
 * @param {string} troubleshooting.severity - 심각도 (Critical, High, Medium, Low)
 * @param {string[]} troubleshooting.tags - 태그 배열
 * @param {number} troubleshooting.resolveTime - 해결 시간 (분)
 * @param {string} troubleshooting.description - 상세 설명
 * @param {string} troubleshooting.solution - 해결 방법
 * @param {string} troubleshooting.code - 코드 스니펫
 */
export async function addTroubleshooting(troubleshooting) {
  const {
    title,
    domain = '전체',
    category = '기타',
    date = new Date().toISOString().split('T')[0],
    severity = 'Medium',
    tags = [],
    resolveTime = null,
    description = '',
    solution = '',
    code = '',
  } = troubleshooting;

  // 심각도 매핑
  const severityMap = {
    Critical: '🔴 Critical',
    High: '🟡 High',
    Medium: '🟢 Medium',
    Low: '⚪ Low',
  };

  // 페이지 속성 구성
  const properties = {
    제목: {
      title: [
        {
          text: {
            content: title,
          },
        },
      ],
    },
    도메인: {
      select: {
        name: domain,
      },
    },
    카테고리: {
      select: {
        name: category,
      },
    },
    발생일: {
      date: {
        start: date,
      },
    },
    심각도: {
      select: {
        name: severityMap[severity] || '🟢 Medium',
      },
    },
  };

  // 태그 추가 (있는 경우)
  if (tags.length > 0) {
    properties.태그 = {
      multi_select: tags.map((tag) => ({ name: tag })),
    };
  }

  // 해결 시간 추가 (있는 경우)
  if (resolveTime !== null) {
    properties['해결 시간'] = {
      number: resolveTime,
    };
  }

  // 페이지 내용 구성
  const children = [];

  // 설명 추가
  if (description) {
    children.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '📋 문제 상황',
            },
          },
        ],
      },
    });
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            text: {
              content: description,
            },
          },
        ],
      },
    });
  }

  // 해결 방법 추가
  if (solution) {
    children.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '✅ 해결 방법',
            },
          },
        ],
      },
    });
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            text: {
              content: solution,
            },
          },
        ],
      },
    });
  }

  // 코드 스니펫 추가
  if (code) {
    children.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            text: {
              content: '💻 코드',
            },
          },
        ],
      },
    });
    children.push({
      object: 'block',
      type: 'code',
      code: {
        rich_text: [
          {
            text: {
              content: code,
            },
          },
        ],
        language: 'javascript',
      },
    });
  }

  // Notion 페이지 생성
  const body = {
    parent: {
      database_id: NOTION_DATABASE_ID,
    },
    properties,
  };

  if (children.length > 0) {
    body.children = children;
  }

  const result = await notionRequest('/pages', 'POST', body);
  console.log(`✅ Notion에 트러블슈팅 추가 완료: ${title}`);
  return result;
}

/**
 * 여러 트러블슈팅 항목을 한 번에 추가
 */
export async function addMultipleTroubleshooting(troubleshootingList) {
  const results = [];
  for (const item of troubleshootingList) {
    try {
      const result = await addTroubleshooting(item);
      results.push({ success: true, title: item.title, result });
    } catch (error) {
      console.error(`❌ 실패: ${item.title}`, error.message);
      results.push({ success: false, title: item.title, error: error.message });
    }
  }
  return results;
}

// CLI로 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔧 Notion 트러블슈팅 로거');
  console.log('이 스크립트는 모듈로 import해서 사용하세요.');
  console.log('');
  console.log('예시:');
  console.log('import { addTroubleshooting } from "./scripts/notion-logger.js";');
  console.log('');
  console.log('await addTroubleshooting({');
  console.log('  title: "로그인 오류",');
  console.log('  domain: "전체",');
  console.log('  category: "기타",');
  console.log('  severity: "High",');
  console.log('  tags: ["버그"],');
  console.log('  description: "문제 상황 설명",');
  console.log('  solution: "해결 방법",');
  console.log('});');
}
