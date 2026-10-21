(() => {
  const SETTINGS_KEY = "sap-english-opic-settings-v1";
  const HISTORY_KEY = "sap-english-opic-history-v1";
  const DEFAULT_TOPICS = ["home", "hobby", "travel", "food"];
  const MIN_TOPICS = 3;
  const MAX_TOPICS = 5;
  const QUESTION_COUNT = 6;

  const EXAM_MODES = {
    mixed: { label: "혼합", short: "혼합" },
    related: { label: "관련 주제", short: "관련" },
    unexpected: { label: "돌발 주제", short: "돌발" }
  };

  const TOPIC_META = {
    self: {
      keywords: ["name", "introduce", "student", "work", "live", "hobby", "free time", "seoul"],
      script: {
        full: "Hi, my name is Jiwon. I'm a university student, and I live in Seoul. I study business, and I'm interested in marketing. In my free time, I usually watch movies or meet my friends. I'm a positive person, and I enjoy spending time with people.",
        ko: "안녕하세요, 제 이름은 지원이에요. 저는 대학생이고 서울에 살아요. 경영학을 공부하고 마케팅에 관심이 있어요. 여가 시간에는 보통 영화를 보거나 친구들을 만나요. 저는 긍정적인 사람이고 사람들과 어울리는 것을 좋아해요."
      }
    },
    home: {
      keywords: ["home", "house", "apartment", "live", "room", "neighborhood", "kitchen", "living room"],
      script: {
        full: "I live in a small apartment in Seoul. It has two rooms, a kitchen, and a living room. My favorite place is the living room because it is bright and comfortable. I usually read or watch TV there. The neighborhood is quiet and close to the subway, so it is convenient.",
        ko: "저는 서울의 작은 아파트에 살아요. 방 두 개, 주방, 거실이 있어요. 가장 좋아하는 공간은 거실인데 밝고 편안하기 때문이에요. 보통 거기서 책을 읽거나 TV를 봐요. 동네는 조용하고 지하철과 가까워서 편리해요."
      }
    },
    work: {
      keywords: ["work", "job", "school", "study", "class", "company", "project", "office", "university"],
      script: {
        full: "I'm a university student, and I study business in Seoul. On a typical day, I have three or four classes, and I study in the library after class. I'm interested in marketing, so I want to work at a company in the future. My schedule is busy, but I enjoy learning new things.",
        ko: "저는 대학생이고 서울에서 경영학을 공부해요. 평소에는 세네 개의 수업을 듣고, 수업이 끝나면 도서관에서 공부해요. 마케팅에 관심이 있어서 앞으로 회사에서 일하고 싶어요. 일정은 바쁘지만 새로운 것을 배우는 것을 즐겨요."
      }
    },
    hobby: {
      keywords: ["hobby", "free time", "enjoy", "weekend", "movie", "music", "park", "guitar"],
      script: {
        full: "My favorite hobby is watching movies. I especially like comedies because they help me relax. I usually watch movies at home with my family on weekends. I also enjoy walking in the park when the weather is nice.",
        ko: "제가 가장 좋아하는 취미는 영화 보기예요. 특히 코미디를 좋아하는데 스트레스를 푸는 데 도움이 되기 때문이에요. 보통 주말에 가족과 집에서 영화를 봐요. 날씨가 좋을 때는 공원에서 걷는 것도 좋아해요."
      }
    },
    travel: {
      keywords: ["travel", "trip", "vacation", "visit", "jeju", "beach", "hotel", "country", "summer"],
      script: {
        full: "Last summer, I went to Jeju Island with my family. We stayed there for four days and visited the beach. We also tried local food and took many pictures. The weather was sunny, so it was a wonderful trip. I would like to go back someday.",
        ko: "지난여름에 가족과 제주도에 갔어요. 4일 동안 머물면서 해변에 갔어요. 지역 음식도 먹어 보고 사진도 많이 찍었어요. 날씨가 맑아서 정말 멋진 여행이었어요. 언젠가 다시 가고 싶어요."
      }
    },
    food: {
      keywords: ["food", "eat", "restaurant", "favorite", "cook", "meal", "lunch", "dinner", "pasta"],
      script: {
        full: "I like Korean food, especially kimchi stew. It is spicy and warm, so I often eat it for lunch. I also like pasta and sushi. I eat out about twice a week with my friends, but I usually cook at home on weekdays.",
        ko: "저는 한국 음식, 특히 김치찌개를 좋아해요. 맵고 따뜻해서 자주 점심으로 먹어요. 파스타와 초밥도 좋아해요. 일주일에 두 번 정도 친구들과 외식하지만 평일에는 보통 집에서 요리해요."
      }
    },
    shopping: {
      keywords: ["shop", "shopping", "buy", "online", "store", "price", "clothes", "sneakers", "product"],
      script: {
        full: "I usually shop online because it is fast and easy. I compare prices and read reviews before I buy something. For clothes, I sometimes go to a store because I want to try them on. I don't shop very often, but I buy what I need.",
        ko: "저는 보통 온라인에서 쇼핑해요. 빠르고 쉽기 때문이에요. 물건을 사기 전에 가격을 비교하고 후기를 읽어요. 옷은 입어 보고 싶어서 가끔 매장에 가요. 자주 쇼핑하지는 않지만 필요한 것은 사요."
      }
    },
    media: {
      keywords: ["movie", "music", "watch", "listen", "favorite", "cinema", "song", "comedy", "singer"],
      script: {
        full: "I like comedy and action movies. Comedies make me feel happy, and action movies are exciting. I usually watch movies at home on weekends. I also listen to pop music and Korean ballads when I walk or study.",
        ko: "저는 코미디와 액션 영화를 좋아해요. 코미디는 저를 행복하게 하고 액션 영화는 흥미진진해요. 보통 주말에 집에서 영화를 봐요. 걸을 때나 공부할 때 팝 음악과 한국 발라드도 들어요."
      }
    }
  };

  const TOPIC_SUPPORT = {
    self: {
      reason: "I'm a positive person, and I enjoy spending time with people, so I get along well with others.",
      example: "In my free time, I usually watch movies or meet my friends.",
      closing: "Nice to meet you."
    },
    home: {
      reason: "I like my home because it is comfortable and convenient.",
      example: "For example, I usually relax in my favorite room on weekends.",
      closing: "Overall, it is a comfortable place to live."
    },
    work: {
      reason: "I like my work because it is interesting and challenging.",
      example: "For example, I usually work on projects with my team during the week.",
      closing: "Overall, I enjoy learning new things at work."
    },
    hobby: {
      reason: "I enjoy it because it helps me relax after a busy day.",
      example: "For example, I usually do it on weekends when I have free time.",
      closing: "Overall, it is an important part of my life."
    },
    travel: {
      reason: "I enjoyed the trip because I could experience something new.",
      example: "For example, I visited local places and tried local food.",
      closing: "I would like to go back someday."
    },
    food: {
      reason: "I like it because it is delicious and comforting.",
      example: "For example, I usually eat it with my friends on weekends.",
      closing: "Overall, it is one of my favorite things."
    },
    shopping: {
      reason: "I like shopping because it is convenient and fun.",
      example: "For example, I usually compare prices before I buy something.",
      closing: "Overall, I try to buy what I need at a good price."
    },
    media: {
      reason: "I like it because it helps me relax and feel happy.",
      example: "For example, I usually enjoy it at home on weekends.",
      closing: "Overall, it is a big part of my free time."
    }
  };

  const TYPE_SUPPORT = {
    습관: {
      reason: "I do it regularly because it is part of my daily routine.",
      example: "For example, I usually do it after work or on weekends.",
      closing: "Overall, it is a simple habit that makes my day better."
    },
    경험: {
      reason: "It was memorable because I experienced something new.",
      example: "For example, I still remember the details from that day.",
      closing: "It was a great experience overall."
    },
    비교: {
      reason: "I prefer it because it fits my lifestyle better.",
      example: "For example, it is more convenient for me on busy days.",
      closing: "For these reasons, I would choose it again."
    },
    계획: {
      reason: "I'm planning it carefully because I want a new experience.",
      example: "For example, I will prepare for it step by step next month.",
      closing: "I hope everything goes well."
    },
    선호: {
      reason: "I prefer it because it suits my taste.",
      example: "For example, I usually choose it when I have a choice.",
      closing: "Overall, it is my favorite option."
    }
  };

  const LEVELS = [
    { min: 95, grade: "AL", desc: "복잡한 주제도 논리적으로 길게 설명할 수 있는 수준" },
    { min: 88, grade: "IH", desc: "다양한 주제를 유창하게 설명하고 근거를 제시하는 수준" },
    { min: 80, grade: "IM3", desc: "경험과 의견을 구체적으로 연결하는 수준" },
    { min: 72, grade: "IM2", desc: "이유와 예시를 들어 자연스럽게 설명하는 수준" },
    { min: 64, grade: "IM1", desc: "익숙한 주제를 3~5문장으로 설명하는 수준" },
    { min: 55, grade: "IL", desc: "일상 주제에 간단한 문장으로 답하는 수준" },
    { min: 45, grade: "NH", desc: "기본 문장은 가능하지만 확장이 부족한 수준" },
    { min: 32, grade: "NM", desc: "짧은 문장과 외운 표현 중심인 수준" },
    { min: 0, grade: "NL", desc: "단어나 아주 짧은 문장 수준" }
  ];

  const STOP_WORDS = new Set([
    "a", "about", "after", "all", "also", "am", "an", "and", "any", "are", "as", "at",
    "be", "because", "been", "before", "but", "by", "can", "could", "did", "do", "does",
    "for", "from", "had", "has", "have", "he", "her", "here", "him", "his", "how", "i",
    "if", "in", "into", "is", "it", "its", "just", "like", "me", "more", "most", "my",
    "no", "not", "of", "on", "or", "our", "please", "she", "so", "some", "tell", "than",
    "that", "the", "their", "them", "then", "there", "they", "this", "to", "too", "up",
    "us", "very", "was", "we", "were", "what", "when", "where", "which", "who", "why",
    "will", "with", "would", "you", "your", "yours"
  ]);

  const CONNECTORS = [
    "because", "so", "but", "also", "for example", "however", "although", "when", "if",
    "after", "before", "usually", "sometimes", "actually", "especially", "since", "while",
    "instead", "in my opinion"
  ];

  const COMPLEX_MARKERS = [
    "because", "although", "when", "if", "after", "before", "that", "which", "who", "while", "since"
  ];

  const REASON_MARKERS = /\b(because|since|that's why|so i|help(?:s|ed)? me|make(?:s|d)? me|allow(?:s|ed)? me)\b/;
  const EXAMPLE_MARKERS = /\b(for example|usually|often|sometimes|on weekends|every (?:day|week|month|year|summer)|on a typical day|last (?:summer|year|week)|when i)\b/;
  const CLOSING_MARKERS = /\b(overall|in short|in conclusion|all in all|that's why i|i would|i want to|i hope|nice to meet you)\b/;

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

  const topicById = new Map(TOPICS.map((topic) => [topic.id, topic]));
  const ttsSupported = "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let settings = loadSettings();
  let examHistory = loadHistory();
  let exam = null;
  let statusTimer = null;
  let activeSpeakButton = null;
  let recognition = null;
  let recognizing = false;
  let recognitionBase = "";
  let recognitionFinal = "";
  let recognitionInterim = "";
  let recognitionError = "";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
    ));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function englishWords(value) {
    return (String(value).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []);
  }

  function contentWords(value) {
    return englishWords(value).filter((word) => !STOP_WORDS.has(word));
  }

  function sentenceUnits(value) {
    const actual = String(value).split(/[.!?]+|\n+/).map((part) => part.trim()).filter(Boolean).length;
    const estimated = Math.min(6, Math.max(1, Math.round(englishWords(value).length / 15)));
    return Math.max(actual, estimated);
  }

  function foundPhrases(text, phrases) {
    const lower = ` ${String(text).toLowerCase()} `;
    return phrases.filter((phrase) => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`).test(lower);
    });
  }

  function loadSettings() {
    const fallback = { topics: DEFAULT_TOPICS, examMode: "mixed", answerMode: "write" };
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (!saved || typeof saved !== "object") return fallback;
      const topics = Array.isArray(saved.topics)
        ? [...new Set(saved.topics.filter((id) => id !== "self" && topicById.has(id)))].slice(0, MAX_TOPICS)
        : DEFAULT_TOPICS;
      return {
        topics: topics.length ? topics : DEFAULT_TOPICS,
        examMode: EXAM_MODES[saved.examMode] ? saved.examMode : "mixed",
        answerMode: saved.answerMode === "speak" || saved.answerMode === "write" ? saved.answerMode : "write"
      };
    } catch {
      return fallback;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }

  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((record) => record && typeof record.averageScore === "number").slice(0, 10);
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(examHistory.slice(0, 10)));
    } catch {
      setStatus("브라우저에 응시 기록을 저장하지 못했습니다.");
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  function gradeForScore(score) {
    return LEVELS.find((level) => score >= level.min) || LEVELS[LEVELS.length - 1];
  }

  function setStatus(message) {
    const element = document.getElementById("english-status");
    if (!element) return;
    element.textContent = message;
    clearTimeout(statusTimer);
    if (message) statusTimer = setTimeout(() => { element.textContent = ""; }, 4500);
  }

  function updateOverview() {
    const latest = examHistory[0];
    const grade = document.getElementById("latest-grade");
    const score = document.getElementById("latest-score");
    const count = document.getElementById("history-count");
    const date = document.getElementById("latest-date");
    if (grade) grade.textContent = latest ? latest.averageGrade : "—";
    if (score) score.textContent = latest ? `${latest.averageScore}점` : "—";
    if (count) count.textContent = `${examHistory.length}회`;
    if (date) {
      date.textContent = latest
        ? `${formatDate(latest.date)} · ${EXAM_MODES[latest.mode]?.short || "혼합"} · ${latest.answerMode === "speak" ? "Speak" : "Write"}`
        : "아직 응시 기록이 없습니다.";
    }
  }

  function renderTopicChoices() {
    const container = document.getElementById("topic-choices");
    if (!container) return;
    container.innerHTML = TOPICS.filter((topic) => topic.id !== "self").map((topic, index) => {
      const active = settings.topics.includes(topic.id);
      return `<button type="button" class="choice-chip${active ? " is-active" : ""}" data-topic-choice="${topic.id}" aria-pressed="${active}">
        <span class="choice-code">${String(index + 1).padStart(2, "0")}</span>
        <span><strong>${escapeHtml(topic.title)}</strong><small>${escapeHtml(topic.english)}</small></span>
      </button>`;
    }).join("");
  }

  function renderModeButtons() {
    document.querySelectorAll("[data-exam-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.examMode === settings.examMode));
    });
    document.querySelectorAll("[data-answer-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.answerMode === settings.answerMode));
      if (button.dataset.answerMode === "speak") {
        button.disabled = !SpeechRecognitionCtor;
        button.title = SpeechRecognitionCtor ? "" : "이 브라우저는 말하기 인식을 지원하지 않습니다.";
      }
    });
    const speechNote = document.getElementById("speech-note");
    if (speechNote && !SpeechRecognitionCtor) {
      speechNote.textContent = "이 브라우저는 Speak 모드를 지원하지 않아 Write 모드로 시작합니다. Chrome 또는 Edge에서 말하기를 사용할 수 있습니다.";
    }
  }

  function planText() {
    if (settings.examMode === "related") return "자기소개 1 + 선택 주제 5문항";
    if (settings.examMode === "unexpected") return "자기소개 1 + 돌발 주제 5문항";
    return "자기소개 1 + 관련 주제 3 + 돌발 주제 2";
  }

  function updateSetupSummary() {
    const count = settings.topics.length;
    const selectionCount = document.getElementById("selection-count");
    const plan = document.getElementById("exam-plan");
    const start = document.getElementById("start-exam");
    if (selectionCount) selectionCount.textContent = `${count}/${MAX_TOPICS} 선택`;
    if (plan) plan.textContent = `${planText()} · ${settings.answerMode === "speak" ? "Speak" : "Write"}로 응시`;
    if (start) start.disabled = count < MIN_TOPICS;
  }

  function renderSetup() {
    renderTopicChoices();
    renderModeButtons();
    updateSetupSummary();
  }

  function makeQuestion(topic, question, questionIndex, origin) {
    return {
      ...question,
      topicId: topic.id,
      topicTitle: topic.title,
      topicEnglish: topic.english,
      questionIndex,
      origin
    };
  }

  function takeQuestions(topics, count, origin, used, output) {
    if (count <= 0 || !topics.length) return;
    const target = output.length + count;
    const queues = shuffle(topics).map((topic) => ({
      topic,
      items: shuffle(topic.questions.map((question, index) => ({ question, index })))
    }));
    while (output.length < target) {
      let added = false;
      for (const queue of queues) {
        if (output.length >= target) break;
        let item = null;
        while (queue.items.length) {
          const candidate = queue.items.shift();
          if (!used.has(`${queue.topic.id}:${candidate.index}`)) {
            item = candidate;
            break;
          }
        }
        if (!item) continue;
        used.add(`${queue.topic.id}:${item.index}`);
        output.push(makeQuestion(queue.topic, item.question, item.index, origin));
        added = true;
      }
      if (!added) break;
    }
  }

  function buildExam() {
    const selectedIds = new Set(settings.topics);
    const selected = TOPICS.filter((topic) => topic.id !== "self" && selectedIds.has(topic.id));
    const unselected = TOPICS.filter((topic) => topic.id !== "self" && !selectedIds.has(topic.id));
    const selfTopic = topicById.get("self");
    const used = new Set(["self:0"]);
    const questions = [makeQuestion(selfTopic, selfTopic.questions[0], 0, "기본")];
    const relatedCount = settings.examMode === "unexpected" ? 0 : settings.examMode === "related" ? 5 : 3;
    const unexpectedCount = QUESTION_COUNT - 1 - relatedCount;
    takeQuestions(selected, relatedCount, "관련", used, questions);
    takeQuestions(unselected, unexpectedCount, "돌발", used, questions);
    if (questions.length < QUESTION_COUNT) {
      takeQuestions(TOPICS.filter((topic) => topic.id !== "self"), QUESTION_COUNT - questions.length, "돌발", used, questions);
    }
    return { questions, index: 0, results: [], startedAt: new Date().toISOString() };
  }

  function currentQuestion() {
    return exam?.questions[exam.index] || null;
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;
    stopRecognition(true);
    stopSpeech();
    const progressLabel = document.getElementById("exam-progress-label");
    const progressFill = document.getElementById("exam-progress-fill");
    const progressTrack = document.querySelector(".exam-top .progress-track");
    const origin = document.getElementById("question-origin");
    const topic = document.getElementById("question-topic");
    const type = document.getElementById("question-type");
    const text = document.getElementById("question-text");
    const korean = document.getElementById("question-ko");
    const modeLabel = document.getElementById("answer-mode-label");
    const guide = document.getElementById("answer-guide");
    const speakControls = document.getElementById("speak-controls");
    const input = document.getElementById("answer-input");
    const evaluation = document.getElementById("evaluation");
    const speakQuestion = document.getElementById("speak-question");
    if (progressLabel) progressLabel.textContent = `Q${exam.index + 1} / ${exam.questions.length}`;
    if (progressFill) progressFill.style.width = `${((exam.index + 1) / exam.questions.length) * 100}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(exam.index + 1));
    if (origin) {
      origin.textContent = question.origin;
      origin.dataset.origin = question.origin;
    }
    if (topic) topic.textContent = `${question.topicTitle} · ${question.topicEnglish}`;
    if (type) type.textContent = question.type;
    if (text) text.textContent = question.question;
    if (korean) korean.textContent = question.questionKo;
    if (modeLabel) modeLabel.textContent = settings.answerMode === "speak" ? "SPEAK" : "WRITE";
    if (guide) {
      guide.textContent = settings.answerMode === "speak"
        ? "말하기 시작을 누르고 영어로 답하세요. 인식된 문장은 제출 전에 직접 수정할 수 있습니다."
        : "질문을 읽고 영어로 3~5문장을 입력하세요. 이유나 예시를 함께 넣으면 좋습니다.";
    }
    if (input) {
      input.value = "";
      input.disabled = false;
    }
    if (evaluation) {
      evaluation.hidden = true;
      evaluation.innerHTML = "";
    }
    if (speakControls) speakControls.hidden = settings.answerMode !== "speak";
    if (speakQuestion) {
      speakQuestion.disabled = !ttsSupported;
      speakQuestion.textContent = "질문 듣기";
      speakQuestion.setAttribute("aria-pressed", "false");
    }
    const submit = document.getElementById("submit-answer");
    if (submit) submit.disabled = false;
    const answerStatus = document.getElementById("answer-status");
    if (answerStatus) answerStatus.textContent = "";
    setSpeakStatus(settings.answerMode === "speak"
      ? (SpeechRecognitionCtor ? "말하기 버튼을 눌러 답변을 시작하세요." : "이 브라우저는 말하기 인식을 지원하지 않습니다.")
      : "", "");
    updateAnswerCount();
    document.getElementById("speak-toggle")?.removeAttribute("disabled");
    if (settings.answerMode === "speak" && !SpeechRecognitionCtor) {
      const toggle = document.getElementById("speak-toggle");
      if (toggle) toggle.disabled = true;
    }
  }

  function updateAnswerCount() {
    const input = document.getElementById("answer-input");
    const count = document.getElementById("answer-count");
    if (count) count.textContent = String(englishWords(input?.value || "").length);
  }

  function explainRelevance(question, text) {
    const topicWords = TOPIC_META[question.topicId]?.keywords || [];
    const questionWords = englishWords(question.question).filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
    const keys = [...new Set([...topicWords, ...questionWords])];
    const lower = String(text).toLowerCase();
    const wordSet = new Set(englishWords(text));
    const hits = keys.filter((key) => key.includes(" ") ? lower.includes(key) : wordSet.has(key));
    return { keys, hits };
  }

  function sanitizeUserSentence(value) {
    let text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    text = text
      .replace(/\bi'm\b/gi, "I'm")
      .replace(/\bi've\b/gi, "I've")
      .replace(/\bi'll\b/gi, "I'll")
      .replace(/\bi'd\b/gi, "I'd")
      .replace(/\bi\b/g, "I");
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) text += ".";
    return text;
  }

  function answerSentences(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    return parts.map(sanitizeUserSentence).filter(Boolean);
  }

  function supportFor(question) {
    return TYPE_SUPPORT[question.type] || TOPIC_SUPPORT[question.topicId] || TOPIC_SUPPORT.self;
  }

  function supportSentence(key, question, text) {
    const support = supportFor(question);
    const candidate = support[key];
    const candidateWords = englishWords(candidate);
    const userWords = new Set(englishWords(text));
    const overlap = candidateWords.filter((word) => userWords.has(word)).length;
    return {
      text: candidate,
      ratio: candidateWords.length ? overlap / candidateWords.length : 0
    };
  }

  function buildTailoredAnswer(text, question) {
    const userSentences = answerSentences(text);
    const normalized = userSentences.join(" ");
    const fallbackSupport = supportFor(question);
    const notes = [];
    if (!userSentences.length) {
      notes.push("작성한 답변이 없어 주제에 맞는 기본 모범답안으로 구성했어요.");
    }

    const coverage = {
      reason: REASON_MARKERS.test(normalized),
      example: EXAMPLE_MARKERS.test(normalized),
      closing: CLOSING_MARKERS.test(normalized)
    };
    const labels = {
      reason: "이유를 설명하는 문장이 없어 이유를 덧붙였어요.",
      example: "구체적인 예시가 부족해 일상 예시 문장을 추가했어요.",
      closing: "답변을 마무리하는 문장이 없어 짧은 마무리 문장을 추가했어요."
    };

    const kept = userSentences.slice(0, 3);
    if (userSentences.length > 3) {
      notes.push("답변이 " + userSentences.length + "문장으로 길어 핵심 " + kept.length + "문장만 남기고 정리했어요.");
    }

    const additions = [];
    ["reason", "example", "closing"].forEach((key) => {
      if (coverage[key]) return;
      const candidate = supportSentence(key, question, normalized);
      if (candidate.ratio < 0.55) {
        additions.push(candidate.text);
        notes.push(labels[key]);
      }
    });

    const all = [...kept, ...additions];
    if (!all.length) all.push(fallbackSupport.reason);
    const answer = sanitizeUserSentence(all.join(" "));
    if (!notes.length) {
      if (coverage.reason && coverage.example && coverage.closing) {
        notes.push("이유·예시·마무리가 모두 들어 있어 사용자 문장을 중심으로 구성했어요.");
      } else {
        notes.push("이미 비슷한 표현이 있어 중복되는 보완 문장은 추가하지 않았어요.");
      }
    }
    return { answer, notes };
  }

  function evaluateAnswer(text, question) {
    const words = englishWords(text);
    const content = contentWords(text);
    const uniqueContent = new Set(content);
    const units = sentenceUnits(text);
    const connectors = foundPhrases(text, CONNECTORS);
    const complex = foundPhrases(text, COMPLEX_MARKERS);
    const relevance = explainRelevance(question, text);
    const ratio = content.length ? uniqueContent.size / content.length : 0;

    let lengthScore = 0;
    if (words.length >= 40 && words.length <= 95) lengthScore = 25;
    else if (words.length > 95 && words.length <= 120) lengthScore = 20;
    else if (words.length > 120) lengthScore = 15;
    else if (words.length >= 30) lengthScore = 18;
    else if (words.length >= 20) lengthScore = 13;
    else if (words.length >= 10) lengthScore = 8;
    else if (words.length > 0) lengthScore = 3;

    let structureScore = units >= 5 ? 12 : units === 4 ? 11 : units === 3 ? 9 : units === 2 ? 5 : 2;
    if (complex.length >= 3) structureScore += 8;
    else if (complex.length === 2) structureScore += 6;
    else if (complex.length === 1) structureScore += 4;
    structureScore = Math.min(20, structureScore);

    let vocabScore = 1;
    if (uniqueContent.size >= 35 && ratio >= 0.55) vocabScore = 20;
    else if (uniqueContent.size >= 28 && ratio >= 0.5) vocabScore = 18;
    else if (uniqueContent.size >= 20 && ratio >= 0.45) vocabScore = 15;
    else if (uniqueContent.size >= 14) vocabScore = 11;
    else if (uniqueContent.size >= 9) vocabScore = 7;
    else if (uniqueContent.size >= 5) vocabScore = 4;

    const connectorScore = connectors.length >= 4 ? 20 : connectors.length === 3 ? 17 : connectors.length === 2 ? 13 : connectors.length === 1 ? 8 : 0;
    const relevanceScore = relevance.hits.length >= 4 ? 15 : relevance.hits.length === 3 ? 13 : relevance.hits.length === 2 ? 10 : relevance.hits.length === 1 ? 6 : 1;
    const total = lengthScore + structureScore + vocabScore + connectorScore + relevanceScore;
    const level = gradeForScore(total);
    const feedback = [];

    if (words.length < 30) feedback.push("답변이 짧습니다. 이유나 예시를 한 문장 더 넣어 3~5문장으로 늘려 보세요.");
    else if (words.length > 100) feedback.push("답변이 깁니다. 핵심 답변을 먼저 말하고 세부 내용은 1~2문장으로 줄여 보세요.");
    if (units < 3) feedback.push("문장이 1~2개에 머물렀습니다. 도입, 이유, 예시로 문장을 나눠 보세요.");
    if (!connectors.length) feedback.push("because, for example, also 같은 연결어를 넣으면 답변의 흐름이 좋아집니다.");
    if (ratio < 0.45 && content.length > 8) feedback.push("같은 단어가 반복됩니다. 비슷한 표현이나 구체적인 형용사를 바꿔 보세요.");
    if (!relevance.hits.length) feedback.push("질문의 주제와 연결되는 단어를 답변에 포함해 보세요.");
    if (!complex.length && words.length >= 25) feedback.push("when, if, because 같은 표현으로 문장을 조금 더 확장해 보세요.");
    if (!feedback.length) feedback.push("분량, 문장 구조, 연결어, 주제 적합도가 고르게 갖춰진 답변입니다.");
    if (total < 55) feedback.push("모범답안을 소리 내어 읽은 뒤, 같은 질문에 다시 답해 보세요.");

    return {
      score: total,
      grade: level.grade,
      gradeDesc: level.desc,
      feedback: feedback.slice(0, 5),
      words: words.length,
      sentences: units,
      connectors: connectors.length,
      relevanceHits: relevance.hits.length,
      relevanceEmphasis: relevance.hits.slice(0, 4),
      breakdown: [
        { label: "분량", score: lengthScore, max: 25 },
        { label: "문장 구성", score: structureScore, max: 20 },
        { label: "어휘 다양성", score: vocabScore, max: 20 },
        { label: "연결어", score: connectorScore, max: 20 },
        { label: "주제 적합도", score: relevanceScore, max: 15 }
      ]
    };
  }

  function renderEvaluation(question) {
    const container = document.getElementById("evaluation");
    const result = exam?.results[exam.index];
    if (!container || !result) return;
    const last = exam.index === exam.questions.length - 1;
    const tailored = result.tailoredAnswer
      ? { answer: result.tailoredAnswer, notes: result.tailoredNotes || [] }
      : buildTailoredAnswer(result.answer || "", question);
    const bars = result.breakdown.map((item) => `<div class="score-bar">
      <span>${item.label}</span>
      <span class="score-bar-track"><span class="score-bar-fill" style="width:${Math.round((item.score / item.max) * 100)}%"></span></span>
      <em>${item.score}/${item.max}</em>
    </div>`).join("");
    const expressions = question.expressions.map(([english, korean]) => `<li>${escapeHtml(english)}<span>${escapeHtml(korean)}</span></li>`).join("");
    container.innerHTML = `<section class="grade-hero">
      <div><span>예상 등급</span><h3>${escapeHtml(result.grade)}</h3><p>${escapeHtml(result.gradeDesc)}</p></div>
      <div class="grade-score"><strong>${result.score}</strong><small>/100</small></div>
    </section>
    <p class="grade-disclaimer">문장 길이·구조·연결어·주제 적합도를 바탕으로 한 학습용 추정입니다.</p>
    <section class="tailored-answer">
      <div class="tailored-head">
        <span class="tailored-badge">PERSONALIZED</span>
        <h3>내 답변 맞춤 보완</h3>
      </div>
      <p class="tailored-intro">내가 쓴 핵심 문장은 살리고, 빠진 이유·예시·마무리를 보완했어요. 문법 교정이 아니라 내용 보완용 답안입니다.</p>
      <p class="tailored-en" lang="en">${escapeHtml(tailored.answer)}</p>
      <ul class="tailored-notes">${tailored.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
      <div class="model-tools">
        <button type="button" class="english-button english-ghost" data-speak-tailored data-speak-label="맞춤답안 듣기"${ttsSupported ? "" : " disabled"}>맞춤답안 듣기</button>
      </div>
    </section>
    <div class="score-bars">${bars}</div>
    <ul class="feedback-list">${result.feedback.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <details class="model-answer">
      <summary>기본 모범답안 보기</summary>
      <p class="model-en" lang="en">${escapeHtml(question.answer)}</p>
      <p class="model-ko">${escapeHtml(question.answerKo)}</p>
      <div class="model-tools">
        <button type="button" class="english-button english-ghost" data-speak-model data-speak-label="모범답안 듣기"${ttsSupported ? "" : " disabled"}>모범답안 듣기</button>
        <button type="button" class="english-button english-ghost" data-open-script="${question.topicId}">주제 스크립트 보기</button>
      </div>
      <ul class="expression-list">${expressions}</ul>
      <div class="template-box"><strong>답변 템플릿</strong>${escapeHtml(question.template)}</div>
      <details class="followup">
        <summary>예상 꼬리질문</summary>
        <p>${escapeHtml(question.followUp.q)}</p>
        <p class="answer-ko">${escapeHtml(question.followUp.a)}</p>
      </details>
    </details>
    <div class="summary-actions">
      <button type="button" class="english-button" data-next-question>${last ? "결과 보기" : "다음 질문"}</button>
    </div>`;
    container.hidden = false;
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function submitAnswer() {
    const input = document.getElementById("answer-input");
    const status = document.getElementById("answer-status");
    const question = currentQuestion();
    if (!input || !question) return;
    const answer = input.value.trim();
    if (!answer) {
      if (status) status.textContent = "답변을 입력하거나 말한 뒤 제출해 주세요.";
      return;
    }
    if (/[가-힣]/.test(answer)) {
      if (status) status.textContent = "영어로 답변해 주세요. 한글은 채점에 반영되지 않습니다.";
      return;
    }
    stopRecognition(true);
    stopSpeech();
    const result = evaluateAnswer(answer, question);
    const tailored = buildTailoredAnswer(answer, question);
    exam.results[exam.index] = {
      ...result,
      answer,
      tailoredAnswer: tailored.answer,
      tailoredNotes: tailored.notes,
      question: question.question,
      topicId: question.topicId,
      topicTitle: question.topicTitle,
      origin: question.origin
    };
    if (input) input.disabled = true;
    const submit = document.getElementById("submit-answer");
    if (submit) submit.disabled = true;
    const toggle = document.getElementById("speak-toggle");
    if (toggle) toggle.disabled = true;
    if (status) status.textContent = "채점이 완료되었습니다. 맞춤 모범답안과 비교해 보세요.";
    renderEvaluation(question);
  }

  function nextQuestion() {
    if (!exam) return;
    if (exam.index >= exam.questions.length - 1) {
      finishExam();
      return;
    }
    exam.index += 1;
    const evaluation = document.getElementById("evaluation");
    if (evaluation) {
      evaluation.hidden = true;
      evaluation.innerHTML = "";
    }
    renderQuestion();
    document.getElementById("exam-run")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function finishExam() {
    const results = exam.results.filter(Boolean);
    const average = Math.round(results.reduce((sum, result) => sum + result.score, 0) / Math.max(1, results.length));
    const averageGrade = gradeForScore(average).grade;
    const record = {
      date: new Date().toISOString(),
      averageScore: average,
      averageGrade,
      mode: settings.examMode,
      answerMode: settings.answerMode,
      topics: [...settings.topics],
      results: results.map((result) => ({
        question: result.question,
        topicTitle: result.topicTitle,
        origin: result.origin,
        score: result.score,
        grade: result.grade
      }))
    };
    examHistory.unshift(record);
    examHistory = examHistory.slice(0, 10);
    saveHistory();
    updateOverview();
    const container = document.getElementById("exam-summary");
    const run = document.getElementById("exam-run");
    const setup = document.getElementById("exam-setup");
    if (run) run.hidden = true;
    if (setup) setup.hidden = true;
    if (!container) return;
    container.innerHTML = `<section class="summary-hero">
      <span class="exam-badge">EXAM COMPLETE</span>
      <h2>평균 ${escapeHtml(averageGrade)} · ${average}점</h2>
      <p>${escapeHtml(EXAM_MODES[settings.examMode]?.label || "혼합")} · ${settings.answerMode === "speak" ? "Speak" : "Write"} · ${formatDate(record.date)}</p>
    </section>
    <div class="summary-rows">${results.map((result, index) => `<div class="summary-row">
      <strong>Q${index + 1} · ${escapeHtml(result.topicTitle)}</strong>
      <span>${escapeHtml(result.origin)}</span>
      <em>${result.score}점 · ${escapeHtml(result.grade)}</em>
    </div>`).join("")}</div>
    <div class="summary-actions">
      <button type="button" class="english-button" data-retry-exam>같은 설정으로 다시 응시</button>
      <button type="button" class="english-button english-ghost" data-edit-settings>시험 설정 변경</button>
    </div>`;
    container.hidden = false;
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderScripts() {
    const list = document.getElementById("script-list");
    if (!list) return;
    const selected = new Set(settings.topics);
    const ordered = [
      ...TOPICS.filter((topic) => topic.id === "self"),
      ...TOPICS.filter((topic) => topic.id !== "self" && selected.has(topic.id)),
      ...TOPICS.filter((topic) => topic.id !== "self" && !selected.has(topic.id))
    ];
    const firstSelected = ordered.find((topic) => topic.id !== "self" && selected.has(topic.id))?.id;
    list.innerHTML = ordered.map((topic, index) => {
      const meta = TOPIC_META[topic.id];
      const isRequired = topic.id === "self";
      const isSelected = !isRequired && selected.has(topic.id);
      const expressions = topic.questions[0].expressions.map(([english, korean]) => `<li>${escapeHtml(english)}<span>${escapeHtml(korean)}</span></li>`).join("");
      const questions = topic.questions.map((question) => `<li>${escapeHtml(question.question)}<span>${escapeHtml(question.questionKo)}</span></li>`).join("");
      return `<details class="card script-card" id="topic-${topic.id}"${topic.id === firstSelected ? " open" : ""}>
        <summary>
          <span class="topic-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="topic-summary-text">
            <strong class="topic-title">${escapeHtml(topic.title)}<span class="script-badge${isRequired ? " is-required" : isSelected ? " is-selected" : ""}">${isRequired ? "고정" : isSelected ? "내 선택" : "돌발 대비"}</span></strong>
            <span class="topic-desc">${escapeHtml(topic.english)} · ${escapeHtml(topic.summary)}</span>
          </span>
        </summary>
        <div class="script-body">
          <p class="script-en" lang="en">${escapeHtml(meta.script.full)}</p>
          <p class="script-ko">${escapeHtml(meta.script.ko)}</p>
          <div class="script-actions">
            <button type="button" class="english-button english-ghost" data-script-speak="${topic.id}" data-speak-label="스크립트 듣기"${ttsSupported ? "" : " disabled"}>스크립트 듣기</button>
          </div>
          <ul class="expression-list">${expressions}</ul>
          <details class="script-questions">
            <summary>이 스크립트로 답할 수 있는 질문 ${topic.questions.length}개</summary>
            <ul>${questions}</ul>
          </details>
        </div>
      </details>`;
    }).join("");
  }

  function openScript(id, updateHash = true) {
    activateTab("scripts", false);
    const section = document.getElementById(`topic-${id}`);
    if (!section) return;
    section.open = true;
    if (updateHash) window.history.replaceState(null, "", `#topic-${id}`);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setSpeakStatus(message, state) {
    const status = document.getElementById("speak-status");
    if (!status) return;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function setRecognitionUi(active) {
    const toggle = document.getElementById("speak-toggle");
    if (!toggle) return;
    toggle.textContent = active ? "말하기 중지" : "말하기 시작";
    toggle.setAttribute("aria-pressed", String(active));
    toggle.disabled = false;
    if (active) setSpeakStatus("듣는 중... 영어로 답해 보세요.", "recording");
  }

  function combineTranscript(...parts) {
    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function startRecognition() {
    if (!SpeechRecognitionCtor) {
      setSpeakStatus("이 브라우저는 말하기 인식을 지원하지 않습니다. Write 모드로 답해 주세요.");
      return;
    }
    if (recognizing || recognition) return;
    const input = document.getElementById("answer-input");
    if (!input) return;
    recognitionError = "";
    recognitionBase = input.value.trim();
    recognitionFinal = "";
    recognitionInterim = "";
    try {
      recognition = new SpeechRecognitionCtor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onstart = () => {
        recognizing = true;
        setRecognitionUi(true);
      };
      recognition.onresult = (event) => {
        recognitionInterim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) recognitionFinal = combineTranscript(recognitionFinal, transcript);
          else recognitionInterim = combineTranscript(recognitionInterim, transcript);
        }
        input.value = combineTranscript(recognitionBase, recognitionFinal, recognitionInterim);
        updateAnswerCount();
      };
      recognition.onerror = (event) => {
        recognitionError = event.error === "not-allowed"
          ? "마이크 권한을 허용해야 말하기 모드를 사용할 수 있습니다."
          : event.error === "no-speech"
            ? "음성이 감지되지 않았습니다. 다시 시도해 주세요."
            : "음성 인식 중 문제가 발생했습니다. Write 모드로 답해도 됩니다.";
      };
      recognition.onend = () => {
        recognition = null;
        recognizing = false;
        input.value = combineTranscript(recognitionBase, recognitionFinal || recognitionInterim);
        updateAnswerCount();
        setRecognitionUi(false);
        if (recognitionError) {
          setSpeakStatus(recognitionError);
          return;
        }
        setSpeakStatus(input.value.trim()
          ? "말한 내용을 확인하고 제출 전에 수정하세요."
          : "인식된 문장이 없습니다. 다시 시도하거나 직접 입력하세요.");
      };
      recognition.start();
      setRecognitionUi(true);
    } catch {
      recognition = null;
      recognizing = false;
      setRecognitionUi(false);
      setSpeakStatus("말하기를 시작하지 못했습니다. Write 모드로 답해 주세요.");
    }
  }

  function stopRecognition(discard = false) {
    if (!recognition) return;
    if (discard) {
      const current = recognition;
      current.onresult = null;
      current.onend = null;
      current.onerror = null;
      try { current.abort(); } catch {}
      recognition = null;
      recognizing = false;
      setRecognitionUi(false);
      return;
    }
    try {
      recognition.stop();
      setSpeakStatus("음성 인식을 마무리하는 중...");
    } catch {
      recognition = null;
      recognizing = false;
      setRecognitionUi(false);
    }
  }

  function resetSpeakButton(button) {
    if (!button) return;
    button.textContent = button.dataset.speakLabel || "듣기";
    button.setAttribute("aria-pressed", "false");
  }

  function stopSpeech() {
    if (activeSpeakButton) resetSpeakButton(activeSpeakButton);
    activeSpeakButton = null;
    if (ttsSupported) window.speechSynthesis.cancel();
  }

  function speak(button, text) {
    if (!ttsSupported) {
      setStatus("이 브라우저는 음성 읽기를 지원하지 않습니다.");
      return;
    }
    if (!text) return;
    if (activeSpeakButton === button) {
      stopSpeech();
      return;
    }
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

  function speakTextFor(button) {
    if (button.id === "speak-question") return currentQuestion()?.question || "";
    if (button.hasAttribute("data-speak-tailored")) return exam?.results[exam.index]?.tailoredAnswer || "";
    if (button.hasAttribute("data-speak-model")) return currentQuestion()?.answer || "";
    if (button.dataset.scriptSpeak) return TOPIC_META[button.dataset.scriptSpeak]?.script.full || "";
    return "";
  }

  function activateTab(name, updateHash = true) {
    const target = name === "scripts" ? "scripts" : "exam";
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      const selected = tab.dataset.tab === target;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(".english-panel").forEach((panel) => {
      panel.hidden = panel.id !== target;
    });
    if (target !== "exam") {
      stopRecognition(true);
      stopSpeech();
    }
    if (updateHash) window.history.replaceState(null, "", `#${target}`);
  }

  function applyHash() {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash === "scripts" || hash === "survey") activateTab("scripts", false);
    else if (hash.startsWith("topic-")) openScript(hash.slice(6), false);
    else activateTab("exam", false);
  }

  function resetExamView() {
    exam = null;
    stopRecognition(true);
    stopSpeech();
    const setup = document.getElementById("exam-setup");
    const run = document.getElementById("exam-run");
    const summary = document.getElementById("exam-summary");
    const evaluation = document.getElementById("evaluation");
    if (setup) setup.hidden = false;
    if (run) run.hidden = true;
    if (summary) {
      summary.hidden = true;
      summary.innerHTML = "";
    }
    if (evaluation) {
      evaluation.hidden = true;
      evaluation.innerHTML = "";
    }
  }

  function startExam() {
    if (settings.topics.length < MIN_TOPICS) {
      const status = document.getElementById("setup-status");
      if (status) status.textContent = "좋아하는 항목을 3개 이상 선택해 주세요.";
      return;
    }
    exam = buildExam();
    const setup = document.getElementById("exam-setup");
    const run = document.getElementById("exam-run");
    const summary = document.getElementById("exam-summary");
    if (setup) setup.hidden = true;
    if (run) run.hidden = false;
    if (summary) {
      summary.hidden = true;
      summary.innerHTML = "";
    }
    activateTab("exam", true);
    renderQuestion();
    document.getElementById("exam")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-tab]");
      if (tab) {
        activateTab(tab.dataset.tab);
        return;
      }
      const topicChoice = event.target.closest("[data-topic-choice]");
      if (topicChoice) {
        const id = topicChoice.dataset.topicChoice;
        const selected = settings.topics.includes(id);
        if (selected) {
          settings.topics = settings.topics.filter((topicId) => topicId !== id);
        } else if (settings.topics.length >= MAX_TOPICS) {
          const status = document.getElementById("setup-status");
          if (status) status.textContent = `좋아하는 항목은 최대 ${MAX_TOPICS}개까지 선택할 수 있습니다.`;
          return;
        } else {
          settings.topics = [...settings.topics, id];
        }
        saveSettings();
        renderTopicChoices();
        updateSetupSummary();
        renderScripts();
        return;
      }
      const examMode = event.target.closest("[data-exam-mode]");
      if (examMode) {
        settings.examMode = examMode.dataset.examMode;
        saveSettings();
        renderModeButtons();
        updateSetupSummary();
        return;
      }
      const answerMode = event.target.closest("[data-answer-mode]");
      if (answerMode) {
        if (answerMode.dataset.answerMode === "speak" && !SpeechRecognitionCtor) {
          const status = document.getElementById("setup-status");
          if (status) status.textContent = "이 브라우저는 Speak 모드를 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.";
          return;
        }
        settings.answerMode = answerMode.dataset.answerMode;
        saveSettings();
        renderModeButtons();
        updateSetupSummary();
        return;
      }
      if (event.target.closest("#start-exam")) {
        startExam();
        return;
      }
      if (event.target.closest("#exit-exam")) {
        if (window.confirm("진행 중인 모의고사를 중단할까요? 제출한 답변은 저장되지 않습니다.")) {
          resetExamView();
          activateTab("exam", true);
        }
        return;
      }
      if (event.target.closest("#speak-toggle")) {
        if (recognizing || recognition) stopRecognition();
        else startRecognition();
        return;
      }
      if (event.target.closest("#submit-answer")) {
        submitAnswer();
        return;
      }
      if (event.target.closest("#speak-question")) {
        speak(event.target.closest("#speak-question"), currentQuestion()?.question || "");
        return;
      }
      const speakButton = event.target.closest("[data-speak-model], [data-speak-tailored], [data-script-speak]");
      if (speakButton) {
        speak(speakButton, speakTextFor(speakButton));
        return;
      }
      const next = event.target.closest("[data-next-question]");
      if (next) {
        nextQuestion();
        return;
      }
      const openScriptButton = event.target.closest("[data-open-script]");
      if (openScriptButton) {
        openScript(openScriptButton.dataset.openScript);
        return;
      }
      if (event.target.closest("[data-retry-exam]")) {
        startExam();
        return;
      }
      if (event.target.closest("[data-edit-settings]")) {
        resetExamView();
        activateTab("exam", true);
      }
    });

    document.getElementById("answer-input")?.addEventListener("input", updateAnswerCount);

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
    window.addEventListener("pagehide", () => {
      stopRecognition(true);
      stopSpeech();
    });
  }

  function init() {
    if (!SpeechRecognitionCtor && settings.answerMode === "speak") {
      settings.answerMode = "write";
      saveSettings();
    }
    renderSetup();
    renderScripts();
    updateOverview();
    bindEvents();
    applyHash();
    if (!ttsSupported) {
      const questionButton = document.getElementById("speak-question");
      if (questionButton) {
        questionButton.disabled = true;
        questionButton.title = "이 브라우저는 음성 읽기를 지원하지 않습니다.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
