#!/usr/bin/env node
/**
 * 트러블슈팅 항목을 Notion에 추가하는 CLI 도구
 * 작업 중 발생한 오류를 빠르게 기록할 수 있습니다.
 */

import * as readline from 'readline';
import { addTroubleshooting } from './notion-logger.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 질문 헬퍼
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// 옵션 선택 헬퍼
async function selectOption(prompt, options) {
  console.log(`\n${prompt}`);
  options.forEach((opt, idx) => {
    console.log(`  ${idx + 1}. ${opt}`);
  });
  const answer = await question('선택 (번호): ');
  const index = parseInt(answer) - 1;
  if (index >= 0 && index < options.length) {
    return options[index];
  }
  console.log('잘못된 선택입니다. 기본값을 사용합니다.');
  return options[0];
}

// 메인 로직
async function main() {
  console.log('🔧 Notion 트러블슈팅 기록 도구\n');

  try {
    // 1. 제목
    const title = await question('제목: ');
    if (!title.trim()) {
      console.log('❌ 제목은 필수입니다.');
      rl.close();
      return;
    }

    // 2. 도메인
    const domain = await selectOption('도메인 선택:', [
      '전체',
      'Member',
      'Post',
      'Global',
      'Config',
      'Frontend',
    ]);

    // 3. 카테고리
    const category = await selectOption('카테고리 선택:', [
      '기타',
      'Spring Boot',
      'JPA/Hibernate',
      'MySQL',
      'API 설계',
      '예외 처리',
      '보안',
      '성능',
      '배포',
    ]);

    // 4. 심각도
    const severity = await selectOption('심각도 선택:', [
      'Critical',
      'High',
      'Medium',
      'Low',
    ]);

    // 5. 태그 (쉼표로 구분)
    const tagsInput = await question('태그 (쉼표로 구분, 선택사항): ');
    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim())
      : [];

    // 6. 해결 시간 (분)
    const resolveTimeInput = await question('해결 시간 (분, 선택사항): ');
    const resolveTime = resolveTimeInput ? parseInt(resolveTimeInput) : null;

    // 7. 문제 상황
    console.log('\n문제 상황 (여러 줄 입력 가능, 빈 줄 입력 시 종료):');
    let description = '';
    while (true) {
      const line = await question('');
      if (!line.trim()) break;
      description += line + '\n';
    }

    // 8. 해결 방법
    console.log('\n해결 방법 (여러 줄 입력 가능, 빈 줄 입력 시 종료):');
    let solution = '';
    while (true) {
      const line = await question('');
      if (!line.trim()) break;
      solution += line + '\n';
    }

    // 9. 코드 스니펫
    console.log('\n코드 스니펫 (선택사항, 여러 줄 입력 가능, 빈 줄 입력 시 종료):');
    let code = '';
    while (true) {
      const line = await question('');
      if (!line.trim()) break;
      code += line + '\n';
    }

    // 확인
    console.log('\n=== 입력 내용 확인 ===');
    console.log(`제목: ${title}`);
    console.log(`도메인: ${domain}`);
    console.log(`카테고리: ${category}`);
    console.log(`심각도: ${severity}`);
    console.log(`태그: ${tags.join(', ')}`);
    console.log(`해결 시간: ${resolveTime || '입력 안 함'}`);
    console.log(`문제 상황: ${description.trim().substring(0, 50)}...`);
    console.log(`해결 방법: ${solution.trim().substring(0, 50)}...`);
    if (code.trim()) {
      console.log(`코드: 있음`);
    }

    const confirm = await question('\n이대로 Notion에 추가하시겠습니까? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 취소되었습니다.');
      rl.close();
      return;
    }

    // Notion에 추가
    console.log('\n📝 Notion에 추가 중...');
    await addTroubleshooting({
      title,
      domain,
      category,
      severity,
      tags,
      resolveTime,
      description: description.trim(),
      solution: solution.trim(),
      code: code.trim(),
    });

    console.log('\n✅ 트러블슈팅이 성공적으로 기록되었습니다!');
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
  } finally {
    rl.close();
  }
}

main();
