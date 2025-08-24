ResultDistribution
Success, Fialure, Unvalidated 이거 백그라운드 색은 없애고, 균등 수평 분할 적용해서 명확하게 구분해라.
그리고, AvgResponseTime min,max는 없애라.

BatchInput 0lines는 sendBatch, Clear btn 밑에 배치하대. 0 lines 부분은 제일 밑에 배치시켜. font size 2개 정도 올리고 white tone으로


내가 Success, Fialure, Unvalidated 이거 그냥 Success 0, Failure 0, Unvalidated 0 이런식으로.. 각 width가 같은 비율로 center 배치. 이게 height를 차지하고 있어서 답답함.
그리고, metrics에서 Card의 title들은 현재 위치를 유지하고, 나머지 숫자나 contenrts들은 Size를 키워서 중앙 배치. 지금은 너무 위에 붙어있다. 
REsult Distribution 같은 경우에는 Success, Faillure, Unvalidated label 현재 사이즈는 유지하면서 균등 배치만 하면 될듯.

PerformanceMetrics, BatchInput top padding을 좀 줄여라. 너무 넓다. 밑에도. 보기는 좋은데 공간을 너무 차지하잖아.

Success 0
Failure 0
Unvalidated 0
이거 굵은 글씨로, 그리고 size도 좀 키워. 그리고, Success는 파란색이야.

1. table header 높이도 조금 더 줄이자.
2. 오른쪽 상단 controller에서 RandomSingle -> Random(Single), FixedMulti -> Fixed(Multi) 이렇게 바꾸고 radius는 조금 더 주자.


fixed(multi) 이것을 선택했을 때는 사용자가 refresh하지 않는한 유지시켜주라. 물론, random으로 하다가 fixed 누르면 그떄 fixed sender를 생성하고 유지하면 된다.
fixed sender를 했을 떄는 fixed-asdilhf, fixed-aolijlij refresh를 하더라도 fixed sender이름은 기존 거랑 동일하면 안 되니께..계속 유지되더라도....
그리고, controller에다가 Session Restart.. 버튼을 눌러 초기화 F5를 대신하자. 이름은 니가 적절한 거로 대신 해줘도 되고.
그리고, 

Fixed(Multi)를 선택하면 자동으로 ConcurrentLimit을 1로 설정하라. 왜냐하면 순차적으로 메시지가 가야되거든.
Random 누르면 Default값 5로

Reset 버튼이 너무 눈에 안 띄네, 약간 배경색을 넣어줘. 어울리는 테마로.

아니 fixed를 누르면 그시점부터는 sender가 reset을 하기전이나 random을 누르기전까지는 무조건 같은 sender로 가야된다고. 
reset하면 새로운 fixed sender로 생성하고. 

sender width를 충분히 확보해서 2줄로 안 써지게 해라. fixed 쓰니까 2줄로 나오네.
> sender width를 충분히 확보해서 2줄로 안 써지게 해라. fixed 쓰니까 2줄로 나오네.\
  그리고 reset 버튼 누르면 중앙에 alert 띄우지 말고, 바로 밑에 padding 좀 주고 미니 popup을 띄워 confirm해. 그게 훨씬 좋은 거야. popup design도 예쁘게

  