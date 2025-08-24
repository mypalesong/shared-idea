#!/usr/bin/env python3
"""
n8n Python Integration Examples
워크플로우 자동화를 위한 Python 활용 코드 모음

필요한 패키지:
pip install requests python-dotenv schedule
"""

import requests
import json
import time
import schedule
from datetime import datetime
from typing import Dict, List, Optional, Any
import os
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

class N8nClient:
    """n8n API 클라이언트"""
    
    def __init__(self, base_url: str = "http://localhost:5678", api_key: str = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({'X-N8N-API-KEY': api_key})
    
    def trigger_webhook(self, webhook_id: str, data: Dict) -> Dict:
        """웹훅 트리거"""
        url = f"{self.base_url}/webhook/{webhook_id}"
        try:
            response = self.session.post(url, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"웹훅 트리거 실패: {e}")
            return {}
    
    def get_workflows(self) -> List[Dict]:
        """워크플로우 목록 조회"""
        url = f"{self.base_url}/api/v1/workflows"
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.json().get('data', [])
        except requests.exceptions.RequestException as e:
            print(f"워크플로우 조회 실패: {e}")
            return []
    
    def execute_workflow(self, workflow_id: str, data: Dict = None) -> Dict:
        """워크플로우 수동 실행"""
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}/execute"
        payload = {"data": data or {}}
        
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"워크플로우 실행 실패: {e}")
            return {}


# ============================================================================
# 예제 1: 시스템 모니터링 자동화
# ============================================================================

def system_health_check():
    """시스템 상태 체크 후 n8n으로 데이터 전송"""
    
    import psutil
    
    # 시스템 정보 수집
    system_info = {
        "timestamp": datetime.now().isoformat(),
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent,
        "network_sent": psutil.net_io_counters().bytes_sent,
        "network_recv": psutil.net_io_counters().bytes_recv,
    }
    
    # n8n 웹훅으로 데이터 전송
    n8n = N8nClient()
    webhook_id = "system-monitor"  # n8n에서 설정한 웹훅 ID
    
    result = n8n.trigger_webhook(webhook_id, system_info)
    
    if result:
        print(f"✅ 시스템 정보 전송 완료: CPU {system_info['cpu_percent']}%")
    else:
        print("❌ 시스템 정보 전송 실패")
    
    return system_info

# ============================================================================
# 예제 2: 로그 파일 모니터링
# ============================================================================

def monitor_log_file(log_path: str, error_keywords: List[str]):
    """로그 파일에서 에러 패턴 감지 및 알림"""
    
    n8n = N8nClient()
    webhook_id = "error-alert"
    
    try:
        with open(log_path, 'r', encoding='utf-8') as file:
            file.seek(0, 2)  # 파일 끝으로 이동
            
            while True:
                line = file.readline()
                if not line:
                    time.sleep(1)
                    continue
                
                # 에러 키워드 검사
                for keyword in error_keywords:
                    if keyword.lower() in line.lower():
                        alert_data = {
                            "timestamp": datetime.now().isoformat(),
                            "log_file": log_path,
                            "error_line": line.strip(),
                            "keyword": keyword,
                            "severity": "ERROR"
                        }
                        
                        # n8n으로 알림 전송
                        n8n.trigger_webhook(webhook_id, alert_data)
                        print(f"🚨 에러 감지: {keyword} - {line.strip()[:100]}")
                        
    except FileNotFoundError:
        print(f"❌ 로그 파일을 찾을 수 없음: {log_path}")
    except Exception as e:
        print(f"❌ 로그 모니터링 오류: {e}")

# ============================================================================
# 예제 3: 데이터베이스 백업 자동화
# ============================================================================

def database_backup_notification():
    """데이터베이스 백업 상태 체크 및 알림"""
    
    import subprocess
    import os
    
    # 백업 명령 실행 (예: PostgreSQL)
    backup_file = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    backup_command = [
        'pg_dump',
        '-h', 'localhost',
        '-U', 'postgres',
        '-d', 'mydb',
        '-f', backup_file
    ]
    
    try:
        # 백업 실행
        result = subprocess.run(backup_command, capture_output=True, text=True)
        
        backup_status = {
            "timestamp": datetime.now().isoformat(),
            "backup_file": backup_file,
            "file_size": os.path.getsize(backup_file) if os.path.exists(backup_file) else 0,
            "success": result.returncode == 0,
            "error_message": result.stderr if result.returncode != 0 else None
        }
        
        # n8n으로 백업 상태 전송
        n8n = N8nClient()
        webhook_id = "backup-status"
        n8n.trigger_webhook(webhook_id, backup_status)
        
        if backup_status["success"]:
            print(f"✅ 백업 성공: {backup_file}")
        else:
            print(f"❌ 백업 실패: {backup_status['error_message']}")
            
    except Exception as e:
        error_data = {
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "success": False
        }
        
        n8n = N8nClient()
        n8n.trigger_webhook("backup-status", error_data)
        print(f"❌ 백업 오류: {e}")

# ============================================================================
# 예제 4: API 데이터 수집 및 처리
# ============================================================================

def fetch_and_process_api_data():
    """외부 API 데이터 수집 후 n8n으로 처리"""
    
    # 예시: 날씨 API 데이터 수집
    weather_api_key = os.getenv('WEATHER_API_KEY')
    city = "Seoul"
    
    weather_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={weather_api_key}&units=metric"
    
    try:
        response = requests.get(weather_url)
        response.raise_for_status()
        weather_data = response.json()
        
        # 데이터 가공
        processed_data = {
            "timestamp": datetime.now().isoformat(),
            "city": weather_data.get("name"),
            "temperature": weather_data.get("main", {}).get("temp"),
            "humidity": weather_data.get("main", {}).get("humidity"),
            "description": weather_data.get("weather", [{}])[0].get("description"),
            "pressure": weather_data.get("main", {}).get("pressure")
        }
        
        # n8n으로 데이터 전송
        n8n = N8nClient()
        webhook_id = "weather-data"
        result = n8n.trigger_webhook(webhook_id, processed_data)
        
        if result:
            print(f"🌤️ 날씨 데이터 전송 완료: {city} {processed_data['temperature']}°C")
        
        return processed_data
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 날씨 API 호출 실패: {e}")
        return None

# ============================================================================
# 예제 5: 파일 처리 자동화
# ============================================================================

def process_files_in_directory(directory_path: str):
    """디렉토리 내 파일 처리 및 결과 전송"""
    
    import glob
    from pathlib import Path
    
    processed_files = []
    
    # CSV 파일 처리 예제
    csv_files = glob.glob(os.path.join(directory_path, "*.csv"))
    
    for csv_file in csv_files:
        try:
            import pandas as pd
            
            # CSV 파일 읽기
            df = pd.read_csv(csv_file)
            
            # 기본 통계 계산
            stats = {
                "filename": os.path.basename(csv_file),
                "rows": len(df),
                "columns": len(df.columns),
                "size_bytes": os.path.getsize(csv_file),
                "column_names": df.columns.tolist(),
                "data_types": df.dtypes.to_dict()
            }
            
            processed_files.append(stats)
            
            # 파일을 처리된 폴더로 이동
            processed_dir = os.path.join(directory_path, "processed")
            os.makedirs(processed_dir, exist_ok=True)
            
            new_path = os.path.join(processed_dir, os.path.basename(csv_file))
            os.rename(csv_file, new_path)
            
        except Exception as e:
            print(f"❌ 파일 처리 실패 {csv_file}: {e}")
    
    # 처리 결과를 n8n으로 전송
    if processed_files:
        result_data = {
            "timestamp": datetime.now().isoformat(),
            "directory": directory_path,
            "processed_count": len(processed_files),
            "files": processed_files
        }
        
        n8n = N8nClient()
        webhook_id = "file-processing"
        n8n.trigger_webhook(webhook_id, result_data)
        
        print(f"📁 {len(processed_files)}개 파일 처리 완료")
    
    return processed_files

# ============================================================================
# 예제 6: 스케줄링 및 자동화 실행
# ============================================================================

def setup_scheduled_tasks():
    """정기적인 작업 스케줄링"""
    
    # 매일 오전 9시에 시스템 체크
    schedule.every().day.at("09:00").do(system_health_check)
    
    # 매 시간마다 날씨 데이터 수집
    schedule.every().hour.do(fetch_and_process_api_data)
    
    # 매일 새벽 2시에 백업
    schedule.every().day.at("02:00").do(database_backup_notification)
    
    # 매주 월요일에 파일 처리
    schedule.every().monday.at("10:00").do(
        lambda: process_files_in_directory("/path/to/files")
    )
    
    print("📅 스케줄 작업 설정 완료")
    print("실행 중인 작업:")
    for job in schedule.jobs:
        print(f"  - {job}")

def run_scheduler():
    """스케줄러 실행"""
    setup_scheduled_tasks()
    
    print("🔄 스케줄러 시작...")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # 1분마다 체크

# ============================================================================
# 예제 7: n8n 워크플로우 관리
# ============================================================================

def manage_n8n_workflows():
    """n8n 워크플로우 관리 예제"""
    
    # API 키를 사용하는 경우
    api_key = os.getenv('N8N_API_KEY')
    n8n = N8nClient(api_key=api_key)
    
    # 모든 워크플로우 조회
    workflows = n8n.get_workflows()
    
    print(f"📋 총 {len(workflows)}개의 워크플로우:")
    
    for workflow in workflows:
        print(f"  - {workflow.get('name')} (ID: {workflow.get('id')})")
        print(f"    활성화: {workflow.get('active')}")
        print(f"    업데이트: {workflow.get('updatedAt')}")
        print()
    
    # 특정 워크플로우 실행 (예시)
    if workflows:
        first_workflow = workflows[0]
        workflow_id = first_workflow.get('id')
        
        execution_data = {
            "test_data": "Python에서 실행",
            "timestamp": datetime.now().isoformat()
        }
        
        result = n8n.execute_workflow(workflow_id, execution_data)
        
        if result:
            print(f"✅ 워크플로우 실행 완료: {first_workflow.get('name')}")
        else:
            print(f"❌ 워크플로우 실행 실패: {first_workflow.get('name')}")

# ============================================================================
# 예제 8: 에러 처리 및 재시도 로직
# ============================================================================

def robust_webhook_call(webhook_id: str, data: Dict, max_retries: int = 3):
    """재시도 로직이 포함된 안정적인 웹훅 호출"""
    
    n8n = N8nClient()
    
    for attempt in range(max_retries):
        try:
            result = n8n.trigger_webhook(webhook_id, data)
            
            if result:
                print(f"✅ 웹훅 호출 성공 (시도 {attempt + 1}/{max_retries})")
                return result
            else:
                raise requests.exceptions.RequestException("빈 응답")
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ 웹훅 호출 실패 (시도 {attempt + 1}/{max_retries}): {e}")
            
            if attempt < max_retries - 1:
                # 지수 백오프로 재시도
                wait_time = (2 ** attempt) * 1
                print(f"🔄 {wait_time}초 후 재시도...")
                time.sleep(wait_time)
            else:
                print(f"❌ 최대 재시도 횟수 초과. 웹훅 호출 최종 실패")
                
                # 실패 알림을 다른 채널로 전송 (예: 이메일, 슬랙)
                failure_notification = {
                    "timestamp": datetime.now().isoformat(),
                    "webhook_id": webhook_id,
                    "original_data": data,
                    "error": str(e),
                    "attempts": max_retries
                }
                
                # 별도의 실패 알림 웹훅으로 전송
                try:
                    n8n.trigger_webhook("failure-notification", failure_notification)
                except:
                    print("❌ 실패 알림 전송도 실패")
                
                return None

# ============================================================================
# 메인 실행부
# ============================================================================

if __name__ == "__main__":
    print("🚀 n8n Python Integration Examples")
    print("=" * 50)
    
    # 예제 실행
    examples = {
        "1": ("시스템 상태 체크", system_health_check),
        "2": ("날씨 데이터 수집", fetch_and_process_api_data),
        "3": ("워크플로우 관리", manage_n8n_workflows),
        "4": ("안정적인 웹훅 호출", lambda: robust_webhook_call(
            "test-webhook", 
            {"message": "테스트 데이터", "timestamp": datetime.now().isoformat()}
        )),
        "5": ("스케줄러 시작", run_scheduler),
    }
    
    print("\n사용 가능한 예제:")
    for key, (name, _) in examples.items():
        print(f"  {key}. {name}")
    
    # 대화형 실행
    try:
        choice = input("\n실행할 예제 번호를 입력하세요 (1-5): ")
        
        if choice in examples:
            name, func = examples[choice]
            print(f"\n🔄 {name} 실행 중...")
            func()
        else:
            print("❌ 잘못된 선택입니다.")
            
    except KeyboardInterrupt:
        print("\n\n👋 프로그램이 중단되었습니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")

# ============================================================================
# 설정 파일 예제 (.env)
# ============================================================================
"""
# .env 파일 예제
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_api_key_here
WEATHER_API_KEY=your_openweather_api_key
DATABASE_URL=postgresql://user:pass@localhost/dbname
"""

# ============================================================================
# Docker Compose와 함께 사용하는 예제
# ============================================================================
"""
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    volumes:
      - n8n_data:/home/node/.n8n
      - ./shared:/home/node/shared

  python-automation:
    build: .
    depends_on:
      - n8n
    environment:
      - N8N_BASE_URL=http://n8n:5678
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    command: python n8n_python_examples.py

volumes:
  n8n_data:
"""