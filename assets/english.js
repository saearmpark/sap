(() => {
  const STORAGE_KEY = "sap-english-quests-v1";

  const QUESTS = [
    {
      day: 1,
      title: "자기소개 뼈대 만들기",
      focus: "Self-introduction",
      minutes: 25,
      topicIds: ["self"],
      tasks: [
        "자기소개 모범답안을 소리 내어 3번 읽기",
        "내 이름·사는 곳·하는 일로 5문장 바꿔 말하기",
        "30초 자기소개를 녹음하고 다시 듣기"
      ]
    },
    {
      day: 2,
      title: "집과 동네 설명하기",
      focus: "Home & neighborhood",
      minutes: 25,
      topicIds: ["home"],
      tasks: [
        "집 구조를 설명하는 3문장 만들기",
        "좋아하는 공간과 이유 말하기",
        "동네에서 자주 가는 곳 2곳 소개하기"
      ]
    },
    {
      day: 3,
      title: "일과 학교 이야기",
      focus: "Work & school",
      minutes: 25,
      topicIds: ["work"],
      tasks: [
        "전공이나 직업과 하루 일과를 4문장으로 말하기",
        "힘들었던 프로젝트 경험 1개 말하기",
        "질문을 듣고 30초 답변 녹음하기"
      ]
    },
    {
      day: 4,
      title: "취미로 말문 열기",
      focus: "Hobbies",
      minutes: 25,
      topicIds: ["hobby"],
      tasks: [
        "좋아하는 취미와 이유 말하기",
        "최근에 시작한 취미 소개하기",
        "실내 취미와 실외 취미 비교하기"
      ]
    },
    {
      day: 5,
      title: "여행 경험 꺼내기",
      focus: "Travel & vacation",
      minutes: 25,
      topicIds: ["travel"],
      tasks: [
        "최근 여행지와 한 일을 4문장으로 말하기",
        "여행 계획을 세우는 순서 설명하기",
        "혼자 여행과 함께 여행 비교하기"
      ]
    },
    {
      day: 6,
      title: "음식과 식당 묘사하기",
      focus: "Food & restaurants",
      minutes: 25,
      topicIds: ["food"],
      tasks: [
        "좋아하는 음식과 이유 말하기",
        "기억에 남는 식당 묘사하기",
        "외식 빈도와 자주 주문하는 메뉴 말하기"
      ]
    },
    {
      day: 7,
      title: "1주 차 복습과 1분 말하기",
      focus: "Review",
      minutes: 35,
      topicIds: ["self", "home", "work"],
      tasks: [
        "Day 1~6 질문 중 5개를 골라 바로 답하기",
        "자기소개 1분 버전으로 녹음하기",
        "어려웠던 주제 1개를 다시 연습하기"
      ]
    },
    {
      day: 8,
      title: "쇼핑 습관 말하기",
      focus: "Shopping",
      minutes: 25,
      topicIds: ["shopping"],
      tasks: [
        "온라인 쇼핑 습관 설명하기",
        "최근에 구매한 물건 소개하기",
        "온라인 쇼핑과 매장 쇼핑 비교하기"
      ]
    },
    {
      day: 9,
      title: "영화와 음악으로 취향 말하기",
      focus: "Movies & music",
      minutes: 25,
      topicIds: ["media"],
      tasks: [
        "좋아하는 영화 장르와 이유 말하기",
        "최근에 본 영화의 줄거리 말하기",
        "좋아하는 음악과 듣는 상황 설명하기"
      ]
    },
    {
      day: 10,
      title: "자기소개와 집 연결하기",
      focus: "Self-introduction + home",
      minutes: 25,
      topicIds: ["self", "home"],
      tasks: [
        "자기소개에 집이나 동네 내용 1문장 추가하기",
        "집에서 보내는 주말 루틴 말하기",
        "두 주제를 연결해 1분 동안 말하기"
      ]
    },
    {
      day: 11,
      title: "일과 취미 연결하기",
      focus: "Work & school + hobbies",
      minutes: 25,
      topicIds: ["work", "hobby"],
      tasks: [
        "하는 일이나 공부와 취미를 연결하기",
        "바쁜 날과 여유로운 날 비교하기",
        "스트레스를 푸는 방법 말하기"
      ]
    },
    {
      day: 12,
      title: "여행과 음식 연결하기",
      focus: "Travel + food",
      minutes: 25,
      topicIds: ["travel", "food"],
      tasks: [
        "최근 여행에서 먹은 음식 소개하기",
        "여행지 맛집을 친구에게 추천하기",
        "여행과 음식 경험을 1분으로 말하기"
      ]
    },
    {
      day: 13,
      title: "쇼핑과 영화 연결하기",
      focus: "Shopping + movies",
      minutes: 25,
      topicIds: ["shopping", "media"],
      tasks: [
        "최근 산 물건과 본 영화를 연결하기",
        "쇼핑 취향과 영화 취향 비교하기",
        "친구에게 물건이나 영화를 추천하기"
      ]
    },
    {
      day: 14,
      title: "최종 모의고사",
      focus: "Mock test",
      minutes: 40,
      topicIds: ["self", "home", "work", "hobby", "travel", "food", "shopping", "media"],
      tasks: [
        "8개 주제에서 질문을 2개씩 골라 답하기",
        "15문항처럼 연속으로 답변하기",
        "취약한 주제 2개를 골라 다시 녹음하기"
      ]
    }
  ];

  const TOPICS = [
    {
      id: "self",
      title: "자기소개",
      english: "Self-introduction",
      summary: "이름, 하는 일, 사는 곳, 여가 활동을 3~5문장으로 말합니다.",
      questions: [
        {
          type: "소개",
          question: "Please introduce yourself.",
          questionKo: "자기소개를 해 주세요.",
          answer: "Hi, my name is Minji. I'm a university student, and I live in Seoul. I study business, and in my free time I usually listen to music or meet my friends. Nice to meet you.",
          answerKo: "안녕하세요, 제 이름은 민지예요. 저는 대학생이고 서울에 살아요. 경영학을 공부하고, 여가 시간에는 보통 음악을 듣거나 친구들을 만나요. 만나서 반가워요.",
          expressions: [
            ["I'm a university student.", "저는 대학생이에요."],
            ["I live in Seoul.", "저는 서울에 살아요."],
            ["In my free time, I usually...", "여가 시간에는 보통 ...해요."]
          ],
          template: "Hi, my name is ___. I'm a ___ and I live in ___. In my free time, I usually ___.",
          followUp: {
            q: "What do you do?",
            a: "I'm a university student. I study business at a university in Seoul."
          }
        },
        {
          type: "습관",
          question: "What do you usually do in your free time?",
          questionKo: "여가 시간에 보통 무엇을 해요?",
          answer: "In my free time, I usually watch movies or listen to music at home. Sometimes I meet my friends and we go to a cafe. I like spending time with them because it helps me relax.",
          answerKo: "여가 시간에는 보통 집에서 영화를 보거나 음악을 들어요. 가끔 친구들을 만나 카페에 가요. 함께 시간을 보내는 것을 좋아하는데, 스트레스를 푸는 데 도움이 되거든요.",
          expressions: [
            ["I usually...", "저는 보통 ...해요."],
            ["Sometimes I...", "가끔 저는 ...해요."],
            ["It helps me relax.", "그게 저를 편안하게 해 줘요."]
          ],
          template: "In my free time, I usually ___. Sometimes I ___ because ___.",
          followUp: {
            q: "Why do you like it?",
            a: "I like it because it helps me relax after a busy day."
          }
        },
        {
          type: "경험",
          question: "Tell me about a recent weekend.",
          questionKo: "최근 주말에 있었던 일을 말해 주세요.",
          answer: "Last weekend, I met my friends in Hongdae. We had lunch together and walked around the area. We also took some pictures and talked a lot. It was a simple weekend, but I really enjoyed it.",
          answerKo: "지난 주말에 홍대에서 친구들을 만났어요. 같이 점심을 먹고 주변을 걸었어요. 사진도 찍고 이야기도 많이 했어요. 평범한 주말이었지만 정말 즐거웠어요.",
          expressions: [
            ["Last weekend, I...", "지난 주말에 저는 ...했어요."],
            ["We had lunch together.", "우리는 같이 점심을 먹었어요."],
            ["I really enjoyed it.", "정말 즐거웠어요."]
          ],
          template: "Last weekend, I ___ with ___. We ___ and ___. It was ___, but I enjoyed it.",
          followUp: {
            q: "What did you talk about?",
            a: "We talked about our classes, our plans for the summer, and some funny stories."
          }
        }
      ]
    },
    {
      id: "home",
      title: "집과 동네",
      english: "Home & neighborhood",
      summary: "집 구조, 좋아하는 공간, 동네의 장점을 설명합니다.",
      questions: [
        {
          type: "묘사",
          question: "Describe your home.",
          questionKo: "집에 대해 설명해 주세요.",
          answer: "I live in a small apartment in Seoul. It has two rooms, a kitchen, and a living room. My favorite place is the living room because it is bright and comfortable. I usually read or watch TV there.",
          answerKo: "저는 서울의 작은 아파트에 살아요. 방 두 개, 주방, 거실이 있어요. 가장 좋아하는 공간은 거실인데 밝고 편안하기 때문이에요. 보통 거기서 책을 읽거나 TV를 봐요.",
          expressions: [
            ["I live in a small apartment.", "저는 작은 아파트에 살아요."],
            ["It has two rooms.", "방이 두 개 있어요."],
            ["My favorite place is...", "제가 가장 좋아하는 곳은 ...이에요."]
          ],
          template: "I live in a ___. It has ___. My favorite place is ___ because ___.",
          followUp: {
            q: "Do you like your home?",
            a: "Yes, I like it because it is close to the subway and many shops."
          }
        },
        {
          type: "습관",
          question: "What do you usually do at home?",
          questionKo: "집에서 보통 무엇을 해요?",
          answer: "After I come home, I usually take a shower and have dinner. Then I relax in my room and watch YouTube or read a book. Before I go to bed, I clean my room a little.",
          answerKo: "집에 오면 보통 샤워를 하고 저녁을 먹어요. 그다음 방에서 쉬면서 유튜브를 보거나 책을 읽어요. 자기 전에는 방을 조금 정리해요.",
          expressions: [
            ["After I come home, I...", "집에 오면 저는 ...해요."],
            ["Then I...", "그다음 저는 ...해요."],
            ["Before I go to bed, I...", "자기 전에 저는 ...해요."]
          ],
          template: "After I come home, I usually ___. Then I ___. Before I go to bed, I ___.",
          followUp: {
            q: "Do you cook at home?",
            a: "Yes, I sometimes cook simple food like pasta or eggs."
          }
        },
        {
          type: "비교",
          question: "Do you prefer living in a house or an apartment?",
          questionKo: "집과 아파트 중 어디에 사는 것을 더 좋아해요?",
          answer: "I prefer an apartment because it is safe and easy to clean. Also, apartments are usually close to public transportation. However, a house is better if you want a garden.",
          answerKo: "저는 아파트를 더 좋아해요. 안전하고 청소하기 쉽기 때문이에요. 또 아파트는 보통 대중교통과 가까워요. 하지만 정원을 원한다면 단독주택이 더 좋아요.",
          expressions: [
            ["I prefer... because...", "저는 ...때문에 ...을 더 좋아해요."],
            ["It is easy to clean.", "청소하기 쉬워요."],
            ["However, ...", "하지만 ..."]
          ],
          template: "I prefer ___ because ___. Also, ___. However, ___.",
          followUp: {
            q: "Would you like to live in a house someday?",
            a: "Yes, maybe someday, but for now an apartment is more convenient for me."
          }
        }
      ]
    },
    {
      id: "work",
      title: "일과 학교",
      english: "Work & school",
      summary: "하는 일이나 전공, 하루 일과, 힘들었던 경험을 말합니다.",
      questions: [
        {
          type: "소개",
          question: "Tell me about your job or school.",
          questionKo: "직업이나 학교 생활에 대해 말해 주세요.",
          answer: "I'm a university student. I study business at a university in Seoul. I usually have three or four classes a day, and I study in the library after class. I'm interested in marketing, so I want to work at a company in the future.",
          answerKo: "저는 대학생이에요. 서울에 있는 대학에서 경영학을 공부해요. 보통 하루에 세네 개의 수업을 듣고, 수업이 끝나면 도서관에서 공부해요. 마케팅에 관심이 있어서 앞으로 회사에서 일하고 싶어요.",
          expressions: [
            ["I'm a university student.", "저는 대학생이에요."],
            ["I'm interested in...", "저는 ...에 관심이 있어요."],
            ["in the future", "앞으로, 미래에"]
          ],
          template: "I'm a ___ at ___. I usually ___. I'm interested in ___, so I want to ___.",
          followUp: {
            q: "What is your favorite class?",
            a: "My favorite class is marketing because I can learn about real companies."
          }
        },
        {
          type: "습관",
          question: "What is a typical day at work or school like?",
          questionKo: "직장이나 학교에서의 평소 하루는 어때요?",
          answer: "On a typical day, I get to school around nine. I have classes in the morning and study in the afternoon. After school, I sometimes meet my friends or go home and rest. I usually go to bed around eleven.",
          answerKo: "평소에는 9시쯤 학교에 도착해요. 오전에는 수업을 듣고 오후에는 공부해요. 방과 후에는 가끔 친구들을 만나거나 집에 가서 쉬어요. 보통 11시쯤 자요.",
          expressions: [
            ["On a typical day, I...", "평소에는 저는 ...해요."],
            ["I get to school around nine.", "9시쯤 학교에 도착해요."],
            ["in the morning / in the afternoon", "오전에 / 오후에"]
          ],
          template: "On a typical day, I get to ___ around ___. I ___ in the morning and ___ in the afternoon. After that, I ___.",
          followUp: {
            q: "What is the busiest part of your day?",
            a: "The morning is the busiest because I have two classes and a lot of homework."
          }
        },
        {
          type: "경험",
          question: "Tell me about a difficult project or assignment.",
          questionKo: "힘들었던 프로젝트나 과제에 대해 말해 주세요.",
          answer: "Last semester, I had a group project about marketing. We had to make a presentation, but our team had different ideas. We talked a lot and divided the work. In the end, we finished it on time and got a good grade.",
          answerKo: "지난 학기에 마케팅 그룹 프로젝트가 있었어요. 발표 자료를 만들어야 했는데 팀원들의 생각이 달랐어요. 많이 이야기하고 역할을 나눴어요. 결국 제시간에 끝내고 좋은 성적을 받았어요.",
          expressions: [
            ["Last semester, I had...", "지난 학기에 저는 ...이 있었어요."],
            ["We had to...", "우리는 ...해야 했어요."],
            ["In the end, ...", "결국 ..."]
          ],
          template: "Last ___, I had a ___. We had to ___, but ___. In the end, we ___.",
          followUp: {
            q: "What did you learn from it?",
            a: "I learned that communication is very important in a team."
          }
        }
      ]
    },
    {
      id: "hobby",
      title: "취미",
      english: "Hobbies",
      summary: "좋아하는 활동, 시작한 계기, 실내와 실외 취미를 비교합니다.",
      questions: [
        {
          type: "취미",
          question: "What is your favorite hobby?",
          questionKo: "가장 좋아하는 취미는 무엇이에요?",
          answer: "My favorite hobby is watching movies. I watch different kinds of movies, but I especially like comedies. I usually watch movies at home with my family. It is a great way to relax.",
          answerKo: "제가 가장 좋아하는 취미는 영화 보기예요. 여러 장르를 보지만 특히 코미디를 좋아해요. 보통 가족과 집에서 영화를 봐요. 스트레스를 푸는 좋은 방법이에요.",
          expressions: [
            ["My favorite hobby is...", "제가 가장 좋아하는 취미는 ...이에요."],
            ["I especially like...", "저는 특히 ...을 좋아해요."],
            ["It is a great way to relax.", "스트레스를 푸는 좋은 방법이에요."]
          ],
          template: "My favorite hobby is ___. I especially like ___ because ___. I usually ___.",
          followUp: {
            q: "How often do you do it?",
            a: "I watch movies about twice a week, usually on weekends."
          }
        },
        {
          type: "경험",
          question: "Tell me about a hobby you started recently.",
          questionKo: "최근에 시작한 취미에 대해 말해 주세요.",
          answer: "I started learning the guitar last year. At first, it was difficult, but I practiced a little every day. Now I can play some simple songs. I feel proud when I play for my friends.",
          answerKo: "작년에 기타를 배우기 시작했어요. 처음에는 어려웠지만 매일 조금씩 연습했어요. 이제 간단한 곡은 칠 수 있어요. 친구들 앞에서 연주하면 뿌듯해요.",
          expressions: [
            ["I started learning...", "저는 ...을 배우기 시작했어요."],
            ["At first, it was difficult.", "처음에는 어려웠어요."],
            ["I feel proud when...", "...할 때 뿌듯해요."]
          ],
          template: "I started ___ last ___. At first, it was ___, but I ___. Now I can ___.",
          followUp: {
            q: "What would you like to learn next?",
            a: "I'd like to learn how to cook Korean food."
          }
        },
        {
          type: "비교",
          question: "Do you prefer indoor or outdoor hobbies?",
          questionKo: "실내 취미와 실외 취미 중 무엇을 더 좋아해요?",
          answer: "I prefer outdoor hobbies because I can get fresh air and exercise. I like walking or riding a bike in the park. However, on rainy days, I stay home and watch movies.",
          answerKo: "저는 실외 취미를 더 좋아해요. 신선한 공기를 마시고 운동할 수 있기 때문이에요. 공원에서 걷거나 자전거를 타는 것을 좋아해요. 하지만 비 오는 날에는 집에서 영화를 봐요.",
          expressions: [
            ["I prefer... because...", "저는 ...때문에 ...을 더 좋아해요."],
            ["get fresh air", "신선한 공기를 마시다"],
            ["on rainy days", "비 오는 날에는"]
          ],
          template: "I prefer ___ hobbies because ___. I like ___. However, ___.",
          followUp: {
            q: "Where do you usually go?",
            a: "I usually go to a park near my house."
          }
        }
      ]
    },
    {
      id: "travel",
      title: "여행과 휴가",
      english: "Travel & vacation",
      summary: "최근 여행, 계획하는 방법, 혼자 여행과 함께 여행을 비교합니다.",
      questions: [
        {
          type: "경험",
          question: "Tell me about your last vacation.",
          questionKo: "최근 휴가에 대해 말해 주세요.",
          answer: "Last summer, I went to Jeju Island with my family. We stayed there for four days. We visited the beach and tried local food. The weather was sunny, and we took many pictures. It was a wonderful trip.",
          answerKo: "지난여름에 가족과 제주도에 갔어요. 4일 동안 머물렀어요. 해변에 가고 지역 음식도 먹었어요. 날씨가 맑아서 사진을 많이 찍었어요. 정말 좋은 여행이었어요.",
          expressions: [
            ["Last summer, I went to...", "지난여름에 저는 ...에 갔어요."],
            ["We stayed there for four days.", "우리는 그곳에서 4일 동안 머물렀어요."],
            ["It was a wonderful trip.", "정말 멋진 여행이었어요."]
          ],
          template: "Last ___, I went to ___ with ___. We stayed there for ___. We ___ and ___. It was ___.",
          followUp: {
            q: "What was the best part?",
            a: "The best part was watching the sunset at the beach."
          }
        },
        {
          type: "계획",
          question: "What do you usually do when you plan a trip?",
          questionKo: "여행을 계획할 때 보통 무엇을 해요?",
          answer: "When I plan a trip, I first choose the place and the dates. Then I look for a hotel and check the price. I also make a list of places to visit and food to try. I like planning, but I leave some free time, too.",
          answerKo: "여행을 계획할 때 먼저 장소와 날짜를 정해요. 그다음 호텔을 찾고 가격을 확인해요. 방문할 곳과 먹을 음식 목록도 만들어요. 계획하는 것을 좋아하지만 여유 시간도 조금 남겨 둬요.",
          expressions: [
            ["When I plan a trip, I...", "여행을 계획할 때 저는 ...해요."],
            ["look for a hotel", "호텔을 찾다"],
            ["make a list of...", "... 목록을 만들다"]
          ],
          template: "When I plan a trip, I first ___. Then I ___. I also ___.",
          followUp: {
            q: "Do you prefer planning everything or being flexible?",
            a: "I prefer being flexible because plans can change."
          }
        },
        {
          type: "선호",
          question: "Do you prefer traveling alone or with other people?",
          questionKo: "혼자 여행하는 것과 다른 사람들과 여행하는 것 중 무엇을 더 좋아해요?",
          answer: "I prefer traveling with other people because I can share the experience with them. We can talk, take pictures, and help each other. But sometimes I enjoy a short trip alone because I can relax.",
          answerKo: "저는 다른 사람들과 여행하는 것을 더 좋아해요. 경험을 함께 나눌 수 있기 때문이에요. 이야기하고 사진을 찍고 서로 도울 수 있어요. 하지만 가끔은 혼자 짧게 여행하며 쉬는 것도 좋아해요.",
          expressions: [
            ["I prefer... because...", "저는 ...때문에 ...을 더 좋아해요."],
            ["share the experience", "경험을 함께 나누다"],
            ["help each other", "서로 돕다"]
          ],
          template: "I prefer traveling with ___ because ___. We can ___. However, sometimes I ___.",
          followUp: {
            q: "Who do you usually travel with?",
            a: "I usually travel with my family or close friends."
          }
        }
      ]
    },
    {
      id: "food",
      title: "음식과 식당",
      english: "Food & restaurants",
      summary: "좋아하는 음식, 기억에 남는 식당, 외식 습관을 말합니다.",
      questions: [
        {
          type: "선호",
          question: "What kind of food do you like?",
          questionKo: "어떤 음식을 좋아해요?",
          answer: "I like Korean food, especially kimchi stew. It is spicy and warm, so I often eat it for lunch. I also like pasta and sushi. I'm not a picky eater, so I enjoy trying new food.",
          answerKo: "저는 한국 음식, 특히 김치찌개를 좋아해요. 맵고 따뜻해서 자주 점심으로 먹어요. 파스타와 초밥도 좋아해요. 편식하지 않아서 새로운 음식을 먹어 보는 것을 즐겨요.",
          expressions: [
            ["I like... especially...", "저는 ...특히 ...을 좋아해요."],
            ["I'm not a picky eater.", "저는 편식하지 않아요."],
            ["try new food", "새로운 음식을 먹어 보다"]
          ],
          template: "I like ___ food, especially ___. It is ___ and ___, so I often eat it for ___. I also like ___.",
          followUp: {
            q: "Is there any food you don't like?",
            a: "I don't like very sweet food, but I can eat almost everything."
          }
        },
        {
          type: "경험",
          question: "Tell me about a restaurant you liked.",
          questionKo: "좋아했던 식당에 대해 말해 주세요.",
          answer: "Last month, I went to a small Italian restaurant near my house. I ordered pasta and salad. The food was delicious, and the staff were friendly. The price was also reasonable. I want to go there again.",
          answerKo: "지난달에 집 근처의 작은 이탈리안 식당에 갔어요. 파스타와 샐러드를 주문했어요. 음식이 맛있었고 직원들도 친절했어요. 가격도 합리적이었어요. 다시 가고 싶어요.",
          expressions: [
            ["Last month, I went to...", "지난달에 저는 ...에 갔어요."],
            ["I ordered...", "저는 ...을 주문했어요."],
            ["The price was reasonable.", "가격이 합리적이었어요."]
          ],
          template: "Last ___, I went to a ___ near ___. I ordered ___. The food was ___ and the staff were ___. I want to ___ again.",
          followUp: {
            q: "What did you like most about it?",
            a: "I liked the atmosphere because it was quiet and comfortable."
          }
        },
        {
          type: "습관",
          question: "How often do you eat out?",
          questionKo: "얼마나 자주 외식해요?",
          answer: "I eat out about twice a week. I usually meet my friends on Friday and we have dinner together. On weekdays, I often cook at home because it is cheaper. I like both eating out and cooking.",
          answerKo: "일주일에 두 번 정도 외식해요. 보통 금요일에 친구들을 만나 같이 저녁을 먹어요. 평일에는 더 저렴해서 집에서 자주 요리해요. 외식과 요리 둘 다 좋아해요.",
          expressions: [
            ["I eat out about twice a week.", "일주일에 두 번 정도 외식해요."],
            ["On weekdays, ...", "평일에는 ..."],
            ["because it is cheaper", "더 저렴하기 때문에"]
          ],
          template: "I eat out about ___ a week. I usually ___. On weekdays, I ___ because ___. I like both ___ and ___.",
          followUp: {
            q: "What do you usually order?",
            a: "I usually order pasta or a simple rice dish."
          }
        }
      ]
    },
    {
      id: "shopping",
      title: "쇼핑",
      english: "Shopping",
      summary: "온라인과 매장 쇼핑, 최근 구매, 선호 이유를 말합니다.",
      questions: [
        {
          type: "습관",
          question: "How do you usually shop?",
          questionKo: "보통 어떻게 쇼핑해요?",
          answer: "I usually shop online because it is fast and easy. I compare prices and read reviews before I buy something. For clothes, I sometimes go to a store because I want to try them on. I don't shop very often, but I buy what I need.",
          answerKo: "저는 보통 온라인에서 쇼핑해요. 빠르고 쉽기 때문이에요. 물건을 사기 전에 가격을 비교하고 후기를 읽어요. 옷은 입어 보고 싶어서 가끔 매장에 가요. 자주 쇼핑하지는 않지만 필요한 것은 사요.",
          expressions: [
            ["I usually shop online.", "저는 보통 온라인으로 쇼핑해요."],
            ["compare prices", "가격을 비교하다"],
            ["try them on", "입어 보다"]
          ],
          template: "I usually shop ___. I ___ before I buy something. For ___, I sometimes ___. I don't shop very often, but I ___.",
          followUp: {
            q: "Do you prefer online shopping?",
            a: "Yes, for most things, but not for clothes or shoes."
          }
        },
        {
          type: "경험",
          question: "Tell me about something you bought recently.",
          questionKo: "최근에 산 물건에 대해 말해 주세요.",
          answer: "Last week, I bought a new pair of sneakers online. I saw them in an ad and liked the design. They were a little expensive, but they are very comfortable. I wear them almost every day now.",
          answerKo: "지난주에 온라인에서 새 운동화를 샀어요. 광고에서 보고 디자인이 마음에 들었어요. 조금 비쌌지만 아주 편해요. 요즘은 거의 매일 신어요.",
          expressions: [
            ["Last week, I bought...", "지난주에 저는 ...을 샀어요."],
            ["a pair of sneakers", "운동화 한 켤레"],
            ["It was a little expensive.", "조금 비쌌어요."]
          ],
          template: "Last ___, I bought ___. I saw it ___ and liked ___. It was ___, but ___. I ___ now.",
          followUp: {
            q: "Was it worth the price?",
            a: "Yes, I think so, because I use them every day."
          }
        },
        {
          type: "비교",
          question: "Do you prefer shopping online or in stores?",
          questionKo: "온라인 쇼핑과 매장 쇼핑 중 무엇을 더 좋아해요?",
          answer: "I prefer online shopping for simple things like books or electronics. It is convenient and usually cheaper. However, I prefer stores for clothes because I can try them on. So it depends on what I buy.",
          answerKo: "책이나 전자제품처럼 간단한 물건은 온라인 쇼핑을 더 좋아해요. 편리하고 보통 더 저렴하기 때문이에요. 하지만 옷은 입어 볼 수 있는 매장을 더 좋아해요. 그래서 무엇을 사는지에 따라 달라요.",
          expressions: [
            ["I prefer... for...", "저는 ...에는 ...을 더 좋아해요."],
            ["It is convenient.", "편리해요."],
            ["It depends on...", "...에 따라 달라요."]
          ],
          template: "I prefer online shopping for ___. It is ___ and ___. However, I prefer stores for ___ because ___. It depends on ___.",
          followUp: {
            q: "What do you usually buy online?",
            a: "I usually buy books, daily items, and sometimes clothes."
          }
        }
      ]
    },
    {
      id: "media",
      title: "영화와 음악",
      english: "Movies & music",
      summary: "좋아하는 장르, 최근 본 영화, 음악을 듣는 습관을 말합니다.",
      questions: [
        {
          type: "선호",
          question: "What kind of movies do you like?",
          questionKo: "어떤 영화를 좋아해요?",
          answer: "I like comedy and action movies. Comedies make me feel happy, and action movies are exciting. I usually watch movies at home on weekends. I also like going to the cinema with my friends.",
          answerKo: "저는 코미디와 액션 영화를 좋아해요. 코미디는 저를 행복하게 하고 액션 영화는 흥미진진해요. 보통 주말에 집에서 영화를 봐요. 친구들과 영화관에 가는 것도 좋아해요.",
          expressions: [
            ["I like... movies.", "저는 ... 영화를 좋아해요."],
            ["make me feel happy", "저를 행복하게 하다"],
            ["go to the cinema", "영화관에 가다"]
          ],
          template: "I like ___ movies. They make me feel ___. I usually watch movies ___. I also like ___.",
          followUp: {
            q: "What is your favorite movie?",
            a: "My favorite movie is The Intern because the story is warm and funny."
          }
        },
        {
          type: "경험",
          question: "Tell me about a movie you watched recently.",
          questionKo: "최근에 본 영화에 대해 말해 주세요.",
          answer: "Recently, I watched a movie called The Intern at home. It was about a young boss and an older intern. The story was warm and funny, and the actors were good. I watched it with my family, and we all enjoyed it.",
          answerKo: "최근에 집에서 '인턴'이라는 영화를 봤어요. 젊은 상사와 나이 든 인턴에 대한 이야기였어요. 이야기가 따뜻하고 재미있었고 배우들도 좋았어요. 가족과 함께 봤는데 모두 즐거웠어요.",
          expressions: [
            ["Recently, I watched...", "최근에 저는 ...을 봤어요."],
            ["It was about...", "...에 대한 내용이었어요."],
            ["We all enjoyed it.", "우리 모두 즐거웠어요."]
          ],
          template: "Recently, I watched ___ at ___. It was about ___. The story was ___ and the actors were ___. I watched it with ___.",
          followUp: {
            q: "Would you recommend it?",
            a: "Yes, I would recommend it if you like warm comedy movies."
          }
        },
        {
          type: "습관",
          question: "What kind of music do you listen to?",
          questionKo: "어떤 음악을 들어요?",
          answer: "I listen to pop music and some Korean ballads. I usually listen to music when I walk or study. Music helps me focus and feel relaxed. I also like singing along, even though I'm not a good singer.",
          answerKo: "저는 팝 음악과 한국 발라드를 들어요. 보통 걸을 때나 공부할 때 음악을 들어요. 음악은 집중하고 편안해지는 데 도움이 돼요. 노래를 잘하지는 않지만 따라 부르는 것도 좋아해요.",
          expressions: [
            ["I listen to...", "저는 ...을 들어요."],
            ["when I walk or study", "걷거나 공부할 때"],
            ["sing along", "따라 부르다"]
          ],
          template: "I listen to ___ and ___. I usually listen to music when I ___. It helps me ___. I also like ___.",
          followUp: {
            q: "Do you have a favorite singer?",
            a: "Yes, I like IU because her songs are easy to listen to."
          }
        }
      ]
    }
  ];

  const questByDay = new Map(QUESTS.map((quest) => [quest.day, quest]));
  const topicById = new Map(TOPICS.map((topic) => [topic.id, topic]));
  const totalTaskCount = QUESTS.reduce((sum, quest) => sum + quest.tasks.length, 0);
  let progress = loadProgress();
  let activeRecorder = null;
  let recordPending = false;
  let activeSpeakButton = null;
  let statusTimer = null;

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object" || !saved.tasks || typeof saved.tasks !== "object") return {};
      const result = {};
      for (const quest of QUESTS) {
        const values = saved.tasks[String(quest.day)];
        if (Array.isArray(values)) result[quest.day] = quest.tasks.map((_, index) => Boolean(values[index]));
      }
      return result;
    } catch {
      return {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: progress, updatedAt: new Date().toISOString() }));
    } catch {
      setStatus("브라우저에 진도를 저장하지 못했습니다.");
    }
  }

  function stateFor(day) {
    const quest = questByDay.get(Number(day));
    if (!quest) return [];
    const current = Array.isArray(progress[day]) ? progress[day] : [];
    progress[day] = quest.tasks.map((_, index) => Boolean(current[index]));
    return progress[day];
  }

  function completedTaskCount(day) {
    return stateFor(day).filter(Boolean).length;
  }

  function isDayComplete(day) {
    const state = stateFor(day);
    return state.length > 0 && state.every(Boolean);
  }

  function completedDayCount() {
    return QUESTS.filter((quest) => isDayComplete(quest.day)).length;
  }

  function doneTaskCount() {
    return QUESTS.reduce((sum, quest) => sum + completedTaskCount(quest.day), 0);
  }

  function nextQuest() {
    return QUESTS.find((quest) => !isDayComplete(quest.day)) || null;
  }

  function setStatus(message) {
    const element = document.getElementById("english-status");
    if (!element) return;
    element.textContent = message;
    clearTimeout(statusTimer);
    if (message) statusTimer = setTimeout(() => { element.textContent = ""; }, 4500);
  }

  function renderQuests() {
    const list = document.getElementById("quest-list");
    if (!list) return;
    const next = nextQuest();
    list.innerHTML = QUESTS.map((quest) => {
      const state = stateFor(quest.day);
      const done = state.every(Boolean);
      const finished = state.filter(Boolean).length;
      const topicButtons = quest.topicIds
        .map((id) => {
          const topic = topicById.get(id);
          return topic ? `<button type="button" class="english-chip" data-topic="${topic.id}">${topic.title}</button>` : "";
        })
        .join("");
      return `<details class="card quest-card${done ? " is-complete" : ""}" data-day="${quest.day}"${next && next.day === quest.day ? " open" : ""}>
        <summary>
          <span class="quest-day">D${quest.day}</span>
          <span class="quest-summary-text">
            <strong class="quest-title">${quest.title}</strong>
            <span class="quest-meta"><span>${quest.focus}</span><span>약 ${quest.minutes}분</span></span>
          </span>
          <span class="quest-badge">${done ? "완료" : `${finished}/${quest.tasks.length}`}</span>
        </summary>
        <div class="quest-body">
          <ul class="quest-tasks">
            ${quest.tasks.map((task, index) => `<li><label class="quest-task${state[index] ? " is-done" : ""}">
              <input type="checkbox" data-day="${quest.day}" data-task-index="${index}"${state[index] ? " checked" : ""}>
              <span>${task}</span>
            </label></li>`).join("")}
          </ul>
          <div class="quest-topics">${topicButtons}</div>
        </div>
      </details>`;
    }).join("");
  }

  function renderTopics() {
    const list = document.getElementById("topic-list");
    if (!list) return;
    list.innerHTML = TOPICS.map((topic, topicIndex) => `<details class="card topic-card" id="topic-${topic.id}"${topicIndex === 0 ? " open" : ""}>
      <summary>
        <span class="topic-index">${String(topicIndex + 1).padStart(2, "0")}</span>
        <span class="topic-summary-text">
          <strong class="topic-title">${topic.title}</strong>
          <span class="topic-desc">${topic.english} · ${topic.summary}</span>
        </span>
        <span class="topic-count">${topic.questions.length}개 질문</span>
      </summary>
      <div class="topic-body">
        ${topic.questions.map((question, questionIndex) => renderQuestion(topic, question, questionIndex)).join("")}
      </div>
    </details>`).join("");
  }

  function renderQuestion(topic, question, index) {
    const key = `${topic.id}:${index}`;
    return `<article class="qa-card" data-qa="${key}">
      <div class="qa-head"><span class="qa-type">${question.type}</span><span class="qa-number">Q${index + 1}</span></div>
      <h3 class="qa-question">${question.question}</h3>
      <p class="qa-question-ko">${question.questionKo}</p>
      <div class="qa-answer">
        <p class="answer-en">${question.answer}</p>
        <p class="answer-ko">${question.answerKo}</p>
      </div>
      <div class="qa-tools">
        <button type="button" class="english-button english-ghost" data-speak="question" data-qa="${key}" aria-pressed="false">질문 듣기</button>
        <button type="button" class="english-button english-ghost" data-speak="answer" data-qa="${key}" aria-pressed="false">답변 듣기</button>
        <button type="button" class="english-button english-ghost" data-record="${key}" aria-pressed="false">녹음 시작</button>
      </div>
      <div class="record-area">
        <p class="record-status" data-record-status="${key}" role="status" aria-live="polite"></p>
        <div class="record-playback" data-playback="${key}" hidden><audio controls preload="metadata"></audio></div>
      </div>
      <ul class="expression-list">
        ${question.expressions.map(([english, korean]) => `<li>${english}<span>${korean}</span></li>`).join("")}
      </ul>
      <div class="template-box"><strong>답변 템플릿</strong>${question.template}</div>
      <details class="followup">
        <summary>예상 꼬리질문</summary>
        <p>${question.followUp.q}</p>
        <p class="answer-ko">${question.followUp.a}</p>
      </details>
    </article>`;
  }

  function renderToday() {
    const container = document.getElementById("today-quest");
    if (!container) return;
    const next = nextQuest();
    if (!next) {
      container.innerHTML = `<section class="card english-today is-complete">
        <span class="tag">COMPLETE</span>
        <h2>14일 코스를 완료했습니다</h2>
        <p>모든 퀘스트를 마쳤습니다. 취약한 주제를 골라 다시 녹음하거나 처음부터 복습해 보세요.</p>
        <button type="button" class="english-button english-ghost" data-reset-quests>다시 시작하기</button>
      </section>`;
      return;
    }
    const state = stateFor(next.day);
    const remaining = state.filter((done) => !done).length;
    const nextTaskIndex = state.findIndex((done) => !done);
    container.innerHTML = `<section class="card english-today">
      <span class="tag">NEXT QUEST</span>
      <h2>Day ${next.day} · ${next.title}</h2>
      <p>${next.focus} · 약 ${next.minutes}분 · 남은 작업 ${remaining}개</p>
      <p class="english-note">다음 작업: ${next.tasks[nextTaskIndex]}</p>
      <button type="button" class="english-button" data-open-day="${next.day}">퀘스트 열기</button>
    </section>`;
  }

  function updateProgressUi() {
    const done = doneTaskCount();
    const percent = totalTaskCount ? Math.round((done / totalTaskCount) * 100) : 0;
    const next = nextQuest();
    const completed = document.getElementById("stat-completed");
    const days = document.getElementById("stat-days");
    const nextEl = document.getElementById("stat-next");
    const label = document.getElementById("progress-label");
    const fill = document.getElementById("quest-progress");
    const track = document.getElementById("quest-progress-track");
    if (completed) completed.textContent = `${done}/${totalTaskCount}`;
    if (days) days.textContent = `${completedDayCount()}/${QUESTS.length}`;
    if (nextEl) nextEl.textContent = next ? `Day ${next.day}` : "완료";
    if (label) label.textContent = `${percent}%`;
    if (fill) fill.style.width = `${percent}%`;
    if (track) track.setAttribute("aria-valuenow", String(percent));
    renderToday();
  }

  function updateQuestVisual(day) {
    const card = document.querySelector(`.quest-card[data-day="${day}"]`);
    if (!card) return;
    const quest = questByDay.get(Number(day));
    if (!quest) return;
    const state = stateFor(day);
    const done = state.every(Boolean);
    card.classList.toggle("is-complete", done);
    const badge = card.querySelector(".quest-badge");
    if (badge) badge.textContent = done ? "완료" : `${state.filter(Boolean).length}/${quest.tasks.length}`;
    card.querySelectorAll(".quest-task").forEach((task, index) => {
      task.classList.toggle("is-done", Boolean(state[index]));
    });
  }

  function activateTab(name, updateHash = true) {
    const target = name === "survey" ? "survey" : "quests";
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      const selected = tab.dataset.tab === target;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(".english-panel").forEach((panel) => {
      panel.hidden = panel.id !== target;
    });
    if (target !== "survey" && activeRecorder && activeRecorder.recorder.state !== "inactive") {
      activeRecorder.recorder.stop();
    }
    if (updateHash) history.replaceState(null, "", `#${target}`);
  }

  function openTopic(id, updateHash = true) {
    activateTab("survey", false);
    const section = document.getElementById(`topic-${id}`);
    if (!section) return;
    section.open = true;
    if (updateHash) history.replaceState(null, "", `#topic-${id}`);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function findQuestion(key) {
    const [topicId, index] = key.split(":");
    return topicById.get(topicId)?.questions[Number(index)];
  }

  function resetSpeechButton(button) {
    if (!button) return;
    button.textContent = button.dataset.speak === "question" ? "질문 듣기" : "답변 듣기";
    button.setAttribute("aria-pressed", "false");
  }

  function stopSpeech() {
    if (activeSpeakButton) resetSpeechButton(activeSpeakButton);
    activeSpeakButton = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speak(button) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatus("이 브라우저는 음성 읽기를 지원하지 않습니다.");
      return;
    }
    if (activeSpeakButton === button) {
      stopSpeech();
      return;
    }
    const question = findQuestion(button.dataset.qa);
    if (!question) return;
    const text = button.dataset.speak === "question" ? question.question : question.answer;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find((item) => /^en(-|_)/i.test(item.lang));
    if (voice) utterance.voice = voice;
    activeSpeakButton = button;
    button.textContent = "읽는 중";
    button.setAttribute("aria-pressed", "true");
    utterance.onend = () => {
      if (activeSpeakButton === button) stopSpeech();
    };
    utterance.onerror = () => {
      if (activeSpeakButton === button) stopSpeech();
      setStatus("음성을 재생하지 못했습니다.");
    };
    window.speechSynthesis.speak(utterance);
  }

  function setRecordStatus(key, message, state = "") {
    const element = document.querySelector(`[data-record-status="${key}"]`);
    if (!element) return;
    element.textContent = message;
    if (state) element.dataset.state = state;
    else delete element.dataset.state;
  }

  function stopRecording() {
    if (activeRecorder && activeRecorder.recorder.state !== "inactive") {
      try { activeRecorder.recorder.stop(); } catch {}
    }
  }

  async function toggleRecording(button) {
    const key = button.dataset.record;
    if (recordPending) return;
    if (activeRecorder) {
      if (activeRecorder.key === key && activeRecorder.recorder.state !== "inactive") {
        activeRecorder.recorder.stop();
      } else {
        setStatus("다른 답변의 녹음을 먼저 중지해 주세요.");
      }
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("이 브라우저는 녹음을 지원하지 않습니다.");
      return;
    }
    recordPending = true;
    button.disabled = true;
    setRecordStatus(key, "마이크 권한을 확인하는 중...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      activeRecorder = { key, recorder, stream, chunks };
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        const playback = document.querySelector(`[data-playback="${key}"]`);
        const audio = playback?.querySelector("audio");
        if (playback && audio) {
          if (audio.dataset.objectUrl) URL.revokeObjectURL(audio.dataset.objectUrl);
          const url = URL.createObjectURL(blob);
          audio.src = url;
          audio.dataset.objectUrl = url;
          playback.hidden = false;
        }
        activeRecorder = null;
        button.disabled = false;
        button.textContent = "다시 녹음";
        button.setAttribute("aria-pressed", "false");
        setRecordStatus(key, "녹음 완료. 재생 버튼으로 확인하세요.");
      });
      recorder.start();
      button.disabled = false;
      button.textContent = "녹음 중지";
      button.setAttribute("aria-pressed", "true");
      setRecordStatus(key, "녹음 중...", "recording");
    } catch (error) {
      button.disabled = false;
      button.textContent = "녹음 시작";
      button.setAttribute("aria-pressed", "false");
      setRecordStatus(key, error?.name === "NotAllowedError"
        ? "마이크 권한을 허용해야 녹음할 수 있습니다."
        : "녹음을 시작하지 못했습니다.");
    } finally {
      recordPending = false;
    }
  }

  function resetProgress() {
    if (!window.confirm("14일 퀘스트 진도를 모두 초기화할까요?")) return;
    progress = {};
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    renderQuests();
    updateProgressUi();
    setStatus("퀘스트 진도를 초기화했습니다.");
  }

  function applyHash() {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash === "survey") activateTab("survey", false);
    else if (hash === "quests") activateTab("quests", false);
    else if (hash.startsWith("topic-")) openTopic(hash.slice(6), false);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-tab]");
      if (tab) {
        activateTab(tab.dataset.tab);
        return;
      }
      const reset = event.target.closest("#reset-quests, [data-reset-quests]");
      if (reset) {
        resetProgress();
        return;
      }
      const openDay = event.target.closest("[data-open-day]");
      if (openDay) {
        const card = document.querySelector(`.quest-card[data-day="${openDay.dataset.openDay}"]`);
        if (card) {
          card.open = true;
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
      const chip = event.target.closest("[data-topic]");
      if (chip) {
        openTopic(chip.dataset.topic);
        return;
      }
      const speakButton = event.target.closest("[data-speak]");
      if (speakButton) {
        speak(speakButton);
        return;
      }
      const recordButton = event.target.closest("[data-record]");
      if (recordButton) toggleRecording(recordButton);
    });

    document.getElementById("quest-list")?.addEventListener("change", (event) => {
      const input = event.target.closest("input[data-day]");
      if (!input) return;
      const day = Number(input.dataset.day);
      const index = Number(input.dataset.taskIndex);
      const state = stateFor(day);
      state[index] = input.checked;
      saveProgress();
      input.closest(".quest-task")?.classList.toggle("is-done", input.checked);
      updateQuestVisual(day);
      updateProgressUi();
    });

    document.querySelector(".english-tabs")?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...document.querySelectorAll("[data-tab]")];
      const currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex < 0) return;
      event.preventDefault();
      let nextIndex = currentIndex;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex].dataset.tab);
    });

    window.addEventListener("hashchange", applyHash);
    window.addEventListener("pagehide", stopRecording);
  }

  function disableUnsupported() {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      document.querySelectorAll("[data-speak]").forEach((button) => {
        button.disabled = true;
        button.title = "이 브라우저는 음성 읽기를 지원하지 않습니다.";
      });
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      document.querySelectorAll("[data-record]").forEach((button) => {
        button.disabled = true;
        button.title = "이 브라우저는 녹음을 지원하지 않습니다.";
      });
    }
  }

  function init() {
    renderTopics();
    renderQuests();
    updateProgressUi();
    bindEvents();
    disableUnsupported();
    applyHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
