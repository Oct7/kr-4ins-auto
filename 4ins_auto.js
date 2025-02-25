(async () => {
  // 1. 사용자 입력 받기
  function getInput(promptText, defaultValue = '') {
    let input = null;
    while (!input) {
      input = prompt(promptText, defaultValue);
      if (input === null) {
        alert('취소되었습니다. 스크립트를 종료합니다.');
        throw new Error('User canceled the prompt.');
      }
      input = input.trim();
      if (!input) {
        alert('빈 값을 입력할 수 없습니다. 다시 시도해주세요.');
        input = null;
      }
    }
    return input;
  }

  const startYear = parseInt(getInput('조회 시작 연도를 입력하세요 (예: 2024):'), 10);
  const startMonth = parseInt(getInput('조회 시작 월을 입력하세요 (1-12):'), 10);
  const endYear = parseInt(getInput('조회 종료 연도를 입력하세요 (예: 2025):'), 10);
  const endMonth = parseInt(getInput('조회 종료 월을 입력하세요 (1-12):'), 10);
  const businessNumber = getInput('사업자 번호를 입력하세요 (숫자만, 예: 0123456789):');

  // 입력 값 검증
  if (
    isNaN(startYear) || isNaN(endYear) ||
    isNaN(startMonth) || isNaN(endMonth) ||
    !/^\d{10,11}$/.test(businessNumber)
  ) {
    alert('입력 값이 유효하지 않습니다. 스크립트를 종료합니다.');
    throw new Error('Invalid input.');
  }

  // 2. 보험별 파라미터 템플릿
  const paramTemplates = {
    // 건강보험 (10)
    '10': {
      url: 'https://si4n.nhis.or.kr/jpbc/JpBca00206.do',
      params: {
        popYn: 'N',
        excelYn: 'Y',
        insuTypeCd: '10',
        firmMgmtNo: `${businessNumber}0`,
        returnName: 'list',
        hidWrkgbn: 'S',
        firmSym: '78317148',
        unitFirmSym: '000',
        gojiChasu: '1',
        nationFinanceCd: '00',
        unbNo: '57110088348',
        firmNpsNo: '20009811105',
        seWonbuNo3: '20201118747',
        seWonbuNo4: '20201118747',
        seWonbuNo: '', // 고용, 산재는 별도 처리
        userId: '',
        passwd: '',
        // 동적으로 채워질 필드
        wrtChasu: '',
        gojiYyyymm: '',
        schYyyy: '',
        schMm: ''
      }
    },

    // 국민연금 (20)
    '20': {
      url: 'https://si4n.nhis.or.kr/jpbc/JpBca00207.do',
      params: {
        popYn: 'N',
        excelYn: 'Y',
        insuTypeCd: '20',
        firmMgmtNo: `${businessNumber}0`,
        returnName: 'list',
        hidWrkgbn: 'S',
        firmSym: '78317148',
        unitFirmSym: '000',
        seWonbuNo: '', // 국민연금은 별도 처리 없음
        userId: '',
        passwd: '',
        wrtChasu: '',
        gojiYyyymm: '',
        schYyyy: '',
        schMm: ''
      }
    },

    // 고용보험 (30)
    '30': {
      url: 'https://si4n.nhis.or.kr/jpbc/JpBca00208.do',
      params: {
        popYn: 'N',
        excelYn: 'Y',
        insuTypeCd: '30',
        firmMgmtNo: `${businessNumber}0`,
        returnName: 'list',
        insuName: '고용보험',
        insuKind: 'EPIC',
        hidWrkgbn: 'S',
        firmSym: '78317148',
        unitFirmSym: '000',
        seWonbuNo: '20201118747',
        userId: '',
        passwd: '',
        wrtChasu: '',
        gojiYyyymm: '',
        schYyyy: '',
        schMm: ''
      }
    },

    // 산재보험 (40)
    '40': {
      url: 'https://si4n.nhis.or.kr/jpbc/JpBca00209.do',
      params: {
        popYn: 'N',
        excelYn: 'Y',
        insuTypeCd: '40',
        firmMgmtNo: `${businessNumber}0`,
        returnName: 'list',
        insuName: '산재보험',
        insuKind: 'IACI',
        hidWrkgbn: 'S',
        firmSym: '78317148',
        unitFirmSym: '000',
        seWonbuNo: '20201118747',
        userId: '',
        passwd: '',
        wrtChasu: '',
        gojiYyyymm: '',
        schYyyy: '',
        schMm: ''
      }
    }
  };

  // 3. 날짜 범위 생성 함수
  function generateDateRange(sY, sM, eY, eM) {
    const result = [];
    let year = sY, month = sM;
    while (year < eY || (year === eY && month <= eM)) {
      result.push({ year, month });
      if (++month > 12) {
        year++;
        month = 1;
      }
    }
    return result;
  }

  // BOM 문자 (UTF-8 인코딩)
  const BOM = '\uFEFF';

  // 4. CSV 처리
  const utils = {
    parseCSV: text =>
      text.split('\n')
          .filter(line => line.trim())
          .map(line => line.split(',').map(field => field.trim())),

    processRow: (type, row, dataMap) => {
      const jumin = row[2].split('-')[0];
      const name = row[3];
      let contribution = 0;

      switch(type) {
        case '10': { // 건강보험
          const 건강 = parseInt(row[13] || '0', 10);
          const 요양 = parseInt(row[26] || '0', 10);
          contribution = 건강 + 요양;
          break;
        }
        case '20': { // 국민연금
          const 연금 = parseInt(row[6] || '0', 10);
          contribution = Math.floor(연금 / 2);
          break;
        }
        case '30': { // 고용보험
          const 고용 = parseInt(row[4] || '0', 10);
          const temp = Math.floor((고용 * 115) / 205);
          contribution = Math.floor(temp / 10) * 10;
          break;
        }
        case '40': { // 산재보험
          contribution = parseInt(row[4] || '0', 10);
          break;
        }
        default:
          break;
      }

      if (!dataMap.has(jumin)) {
        dataMap.set(jumin, {
          주민번호: jumin,
          name,
          건강: 0,
          연금: 0,
          고용: 0,
          산재: 0,
          총합: 0
        });
      }

      const personData = dataMap.get(jumin);
      if (type === '10') personData.건강 += contribution;
      if (type === '20') personData.연금 += contribution;
      if (type === '30') personData.고용 += contribution;
      if (type === '40') personData.산재 += contribution;
      personData.총합 += contribution;
    },

    generateSummary: (dataMap) => {
      let csv = '주민번호,성명,건강보험,국민연금,고용보험,산재보험,총납부액\n';
      const total = { 건강:0, 연금:0, 고용:0, 산재:0, 총합:0 };

      dataMap.forEach(data => {
        csv += `${data.주민번호},${data.name},${data.건강},${data.연금},${data.고용},${data.산재},${data.총합}\n`;
        total.건강 += data.건강;
        total.연금 += data.연금;
        total.고용 += data.고용;
        total.산재 += data.산재;
        total.총합 += data.총합;
      });

      // 합계 행 추가
      csv += `합계,,${total.건강},${total.연금},${total.고용},${total.산재},${total.총합}`;
      return BOM + csv; // BOM 추가
    }
  };

  // 5. 메인 처리 루프
  const dates = generateDateRange(startYear, startMonth, endYear, endMonth);
  const insuNames = { '10':'건강', '20':'연금', '30':'고용', '40':'산재' };

  for (const { year, month } of dates) {
    const monthlyData = new Map();
    const reqYyyymm = `${year}${String(month).padStart(2, '0')}`;
    const filenameYyyymm = reqYyyymm;

    // 각 보험료 처리
    for (const insuType of ['10', '20', '30', '40']) {
      const { url, params } = paramTemplates[insuType];
      const newParams = {
        ...params,
        wrtChasu: `${reqYyyymm}2001`,
        gojiYyyymm: reqYyyymm,
        schYyyy: String(year),
        schMm: String(month)
      };

      try {
        // 4대보험 데이터 요청
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Access-Control-Allow-Origin': 'https://si4n.nhis.or.kr'
          },
          body: new URLSearchParams(newParams)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseClone = response.clone();

        // 응답을 EUC-KR로 디코딩
        const arrayBuf = await response.arrayBuffer();
        const decoder = new TextDecoder('euc-kr');
        const text = decoder.decode(arrayBuf);

        // CSV 파싱 및 데이터 누적
        const rows = utils.parseCSV(text);
        rows.slice(1).forEach(row => utils.processRow(insuType, row, monthlyData));

        // 원본 CSV 파일 다운로드
        const blob = await responseClone.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${filenameYyyymm}_${insuNames[insuType]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
        console.log(`[다운로드 완료] ${insuNames[insuType]}_${filenameYyyymm}.csv`);
        await new Promise(res => setTimeout(res, 800));
      } catch (err) {
        console.error(`[${insuNames[insuType]}] 오류:`, err);
      }
    }
    // 월별 요약 CSV 생성 및 다운로드
    const summaryCSV = utils.generateSummary(monthlyData);
    const summaryBlob = new Blob([summaryCSV], { type: 'text/csv;charset=utf-8;' });
    const summaryLink = document.createElement('a');
    summaryLink.href = URL.createObjectURL(summaryBlob);
    summaryLink.download = `${filenameYyyymm}_월별합산.csv`;
    summaryLink.click();
    URL.revokeObjectURL(summaryLink.href);
    await new Promise(res => setTimeout(res, 1500));
  }

  console.log('모든 처리 완료!');
})();