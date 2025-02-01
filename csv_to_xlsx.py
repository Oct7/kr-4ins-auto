# pip install pandas openpyxl 하세요~

import os
import pandas as pd

def convert_all_csv_in_folder(input_folder='inputs', output_folder='outputs'):
    """
    inputs 폴더 내의 모든 CSV 파일을 탐색:
    1. 우선 'utf-8'로 read_csv() 시도
    2. 실패하면 'euc-kr'(cp949)로 재시도
    3. 변환된 DataFrame을 XLSX로 저장
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    files = os.listdir(input_folder)

    for file_name in files:
        if file_name.lower().endswith('.csv'):
            csv_path = os.path.join(input_folder, file_name)
            base_name = os.path.splitext(file_name)[0]
            xlsx_path = os.path.join(output_folder, base_name + '.xlsx')

            encoding_used = None
            df = None

            # 1) UTF-8 시도
            try:
                df = pd.read_csv(csv_path, encoding='utf-8')
                encoding_used = 'utf-8'
            except UnicodeDecodeError:
                # 2) EUC-KR 재시도
                try:
                    df = pd.read_csv(csv_path, encoding='euc-kr')
                    encoding_used = 'euc-kr'
                except Exception as e:
                    print(f"[에러] {csv_path} - utf-8/euc-kr 둘 다 실패: {e}")
                    continue

            # 정상적으로 읽었다면, XLSX로 저장
            df.to_excel(xlsx_path, index=False, engine='openpyxl')
            print(f"[완료] {csv_path} → {xlsx_path} (인코딩: {encoding_used})")


if __name__ == "__main__":
    convert_all_csv_in_folder()
