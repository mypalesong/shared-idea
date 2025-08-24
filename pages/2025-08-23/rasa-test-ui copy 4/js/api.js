import { CONFIG } from './config.js';

export class APIClient {
  constructor(webhookUrl = CONFIG.api.webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.abortControllers = new Map();
    this.sampleAnswers = this.generateSampleAnswers();
  }
  
  generateSampleAnswers() {
    return [
      `# 제품 마스터 데이터 조회 결과

## 📋 기본 정보
**제품 ID**: PROD-2024-001  
**제품명**: 스마트 무선 이어폰 Pro  
**카테고리**: Electronics > Audio

### 📊 주요 속성
| 속성 | 값 |
|------|-----|
| **브랜드** | TechSound |
| **색상** | 블랙, 화이트, 블루 |
| **가격** | ₩199,000 |
| **재고** | 847개 |

### 🔧 기술 사양
- **배터리**: 최대 8시간 재생
- **연결**: Bluetooth 5.2
- **방수등급**: *IPX7*
- **노이즈 캔슬링**: ✅ 지원

> **참고**: 이 제품은 현재 **베스트셀러** 상품입니다.

자세한 정보는 [제품 상세 페이지](https://example.com/product/001)에서 확인하세요.`,

      `# 🎧 고객 지원 응답

## 문의 내용 분석
**문의 유형**: 제품 불량  
**고객 등급**: VIP  
**예상 처리 시간**: 24시간 이내

### 📞 즉시 조치 사항
1. **제품 교환** 신청 접수 완료
2. **픽업 서비스** 예약 (내일 오전 10시)
3. *임시 대체품* 제공 가능

### 💳 보상 옵션
| 옵션 | 내용 | 처리 시간 |
|------|-----|----------|
| **즉시 교환** | 동일 제품으로 교체 | 1-2일 |
| **업그레이드** | 상위 모델로 교체 | 3-5일 |
| **환불** | 전액 환불 처리 | 5-7일 |

### ✅ Next Steps
\`\`\`
1. 고객 확인 전화 (30분 내)
2. 택배 픽업 예약 확정
3. 교체품 발송 준비
\`\`\`

> **고객 만족 우선**: VIP 고객님께는 **특별 할인 쿠폰**도 함께 제공됩니다.

담당자: 김서비스 (ext. 1234)`,

      `# 🔧 API 연동 가이드

## 주문 처리 API 연동 결과

### ✅ 연동 상태
**API 엔드포인트**: \`/api/v2/orders\`  
**인증 방식**: Bearer Token  
**응답 시간**: 245ms

### 📦 주문 정보 처리
\`\`\`json
{
  "orderId": "ORD-20240121-001",
  "status": "confirmed",
  "items": [
    {
      "productId": "PROD-2024-001",
      "quantity": 2,
      "price": 199000
    }
  ],
  "totalAmount": 398000
}
\`\`\`

### 🚀 처리 단계
1. **주문 검증** ✅ 완료
2. **재고 확인** ✅ 완료  
3. **결제 승인** ✅ 완료
4. ***배송 준비 중*** 🚛

#### 예상 일정
| 단계 | 예상 시간 |
|------|----------|
| 포장 완료 | 2시간 후 |
| 배송 시작 | 내일 오전 |
| **배송 완료** | 1-2일 후 |

> **알림**: 배송 추적은 [여기](https://tracking.example.com)에서 가능합니다.`,

      `# 📊 시스템 성능 리포트

## 💻 실시간 모니터링 결과
**조회 시간**: 2024-01-21 15:30  
**시스템 상태**: 🟢 정상 운영 중

### 📈 주요 지표
| 메트릭 | 현재 값 | 목표치 | 상태 |
|--------|---------|--------|------|
| **가동률** | 99.9% | >99.5% | ✅ 양호 |
| **응답시간** | 245ms | <500ms | ✅ 양호 |
| **처리량** | 15,000/분 | >10,000/분 | ✅ 양호 |
| **에러율** | 0.02% | <0.1% | ✅ 양호 |

### 🔧 최근 최적화 내역
1. **데이터베이스 인덱싱**  
   → 쿼리 속도 *40% 향상*
2. **CDN 설정 개선**  
   → 응답 지연 25ms 단축
3. **메모리 최적화**  
   → RAM 사용량 15% 감소

\`\`\`bash
# 서버 상태 확인
$ systemctl status webapp
● webapp.service - Active (running)
  Uptime: 45 days, 12 hours
\`\`\`

> ⚠️ **예정된 점검**: 일요일 오전 3시 (약 2시간 소요)`,

      `# 🔒 보안 인증 설정

## 2단계 인증(2FA) 활성화 안내

### 📱 설정 방법
**인증 앱 다운로드** → **QR 코드 스캔** → **인증 완료**

#### 지원되는 앱
- **Google Authenticator** ⭐ 추천
- *Microsoft Authenticator*
- Authy
- LastPass Authenticator

### 🛡️ 보안 강화 옵션
\`\`\`
✅ SMS 인증 (기본)
✅ 앱 기반 TOTP (권장)
✅ 하드웨어 키 (YubiKey)
\`\`\`

### ⚡ 빠른 설정 가이드
1. **설정 → 보안** 메뉴 이동
2. ***2단계 인증*** 클릭
3. QR 코드로 앱과 연동
4. 백업 코드 **안전한 곳에 보관**

| 보안 등급 | 설정 방법 | 보안 수준 |
|-----------|----------|----------|
| 기본 | 비밀번호만 | ⭐⭐ |
| 강화 | 2FA 활성화 | ⭐⭐⭐⭐ |
| **최고** | 2FA + 하드웨어 키 | ⭐⭐⭐⭐⭐ |

> 🚨 **중요**: 3월 31일까지 **필수 설정**해야 합니다!`
    ];
  }
  
  async sendRequest(payload, requestId) {
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        timeout: CONFIG.api.timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseResponse(data);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      this.abortControllers.delete(requestId);
    }
  }
  
  parseResponse(data) {
    const flows = Array.isArray(data?.flows) ? data.flows : [];
    const currentFlow = flows.find(
      flow => typeof flow?.set_slot === 'string' && 
              flow.set_slot.startsWith('current_flow=')
    );
    
    const intentAnswer = currentFlow 
      ? currentFlow.set_slot.split('=', 2)[1] 
      : 'product_master_data';
    
    // Extract answer from response - could be in various formats
    let answer = data?.answer || '';
    
    // If no direct answer, try to extract from flows or other fields
    if (!answer && Array.isArray(data?.responses)) {
      const textResponses = data.responses.filter(r => r.text);
      answer = textResponses.map(r => r.text).join(' ');
    }
    
    // Fallback to text field or use sample data for testing
    if (!answer && data?.text) {
      answer = data.text;
    }
    
    // For testing: always use sample markdown answers to demonstrate MD rendering
    const randomIndex = Math.floor(Math.random() * this.sampleAnswers.length);
    answer = this.sampleAnswers[randomIndex];
    
    return {
      intentAnswer,
      answer,
      rawResponse: data,
      flows
    };
  }
  
  cancelRequest(requestId) {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }
  
  cancelAllRequests() {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
}