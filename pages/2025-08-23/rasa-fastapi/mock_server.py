# mock_server.py
import asyncio
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

import random
import string

# ---------------------------
# Config
# ---------------------------
PORT = 30916
PATH = "/webhooks/myio/webhook"

# 간단한 휴리스틱: 메시지 키워드 → 의도 매핑
INTENT_KEYWORDS = [
    ("product_master_data", ["product", "상품", "마스터", "master", "카탈로그", "catalog"]),
    ("order_tracking",      ["order", "주문", "배송", "tracking", "track"]),
    ("refund_policy",       ["refund", "환불", "반품", "return"]),
    ("greeting",            ["hello", "hi", "안녕", "hey", "ㅎㅇ"]),
    ("goodbye",             ["bye", "goodbye", "잘가", "종료", "끝"]),
]
DEFAULT_INTENT = "faq_general"

# 정답과 일부러 다르게도 나오도록 (OK/NG 분포 확인용)
# ground truth를 프론트에서 비교하므로 서버는 그냥 의도만 결정해서 반환
# 아래 확률로 "의도 뒤틀기" 옵션 (0.0~1.0)
INTENT_PERTURB_PROB = 0.15  # 15% 정도는 다른 의도로 응답해보자


# ---------------------------
# FastAPI App
# ---------------------------
app = FastAPI(title="Mock MyIO Webhook", version="1.0.0")

# CORS: 프론트가 file://, 다른 도메인에서도 부를 수 있게 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요 시 특정 오리진만 허용하도록 바꾸세요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WebhookPayload(BaseModel):
    sender: str
    message: str
    metadata: Optional[Dict[str, Any]] = None


def pick_intent_by_keywords(message: str) -> str:
    msg_lower = message.lower()
    for intent, keys in INTENT_KEYWORDS:
        if any(k.lower() in msg_lower for k in keys):
            return intent
    return DEFAULT_INTENT


def maybe_perturb_intent(intent: str) -> str:
    if random.random() < INTENT_PERTURB_PROB:
        # 의도 리스트에서 다른 걸 하나 랜덤으로 고름
        pool = [i for i, _ in INTENT_KEYWORDS] + [DEFAULT_INTENT]
        pool = [i for i in pool if i != intent]
        return random.choice(pool)
    return intent


@app.get("/")
async def root():
    return {
        "service": "Mock MyIO Webhook",
        "status": "ok",
        "path": PATH,
        "port": PORT,
        "hint": "POST a JSON to /webhooks/myio/webhook with {sender, message, metadata}",
    }

@app.get("/health")
async def root():
    return {
        "service": "Mock MyIO Webhook",
        "status": "ok",
        "path": PATH,
        "port": PORT,
        "hint": "POST a JSON to /webhooks/myio/webhook with {sender, message, metadata}",
    }


@app.post(PATH)
async def webhook(payload: WebhookPayload, request: Request):
    # 수신 시각/처리 시작
    recv_at = datetime.now(timezone.utc)
    t0 = time.perf_counter()

    # 1) 랜덤 지연: 1 ~ 10초
    delay = random.uniform(0.3, 2.0)
    await asyncio.sleep(delay)

    # 2) 간단한 의도 판정
    intent = pick_intent_by_keywords(payload.message or "")
    intent = maybe_perturb_intent(intent)

    # 3) 응답 텍스트(아무 말이나)
    answer_text = f"Detected intent: {intent}"

    # 4) 프론트 파서에 맞춘 스키마
    # flows[].set_slot 에 반드시 "current_flow=<intent>" 형태 포함
    random_string = ''.join(random.choices(string.ascii_letters + string.digits, k=500))
    random_string

    resp: Dict[str, Any] = {
        "text": answer_text,
        "flows": [
            {"set_slot": f"current_flow={intent}"},
            # 다른 슬롯이 있어도 무시됨. 예시로 하나 더:
            {"set_slot": f"debug_delay={delay:.2f}s"},
        ],
        # 디버그용 부가 정보 (프론트는 사용하지 않음)
        "echo": {
            "sender": payload.sender,
            "message": payload.message,
            "answer": random_string,
            "received_at": recv_at.isoformat(),
            "client_host": request.client.host if request.client else None,
        },
    }

    # 5) 처리 시간(서버 관점) 기록
    elapsed = time.perf_counter() - t0
    resp["server_metrics"] = {
        "delay_s": round(delay, 3),
        "elapsed_s": round(elapsed, 3),
    }

    return resp


if __name__ == "__main__":
    # uvicorn으로 바로 실행 (포트 30916)
    uvicorn.run(
        "mock_server:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,  # 개발 중이면 True로
        workers=1,
        log_level="info",
    )
