#!/bin/bash

echo "로컬 서버를 시작합니다..."

# (1) 파이썬 웹 서버 백그라운드로 실행 (포트 8000)
python3 -m http.server 8001 &

# (2) 서버가 뜨는 시간 기다림 (2초)
sleep 2

# (3) 기본 브라우저로 페이지 열기 (맥 기본 브라우저)
# open "http://localhost:8001/run_4ins_auto.html"

# (또는 특정 브라우저로 열고 싶으면:)
open -a "Google Chrome" "http://localhost:8001/run_4ins_auto.html"

echo "브라우저가 열렸습니다. 서버를 중지하려면 이 터미널 창을 닫거나 Ctrl + C 하세요."