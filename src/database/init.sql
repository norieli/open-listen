-- 初始化示例数据

-- 示例课程1
INSERT OR IGNORE INTO episodes (id, title, difficulty, category, audioPath, transcript, translation, lrc, questions) VALUES
('ep001', 'At the Restaurant', 'elementary', 'Daily Life', '', 
'[00:00.00]Welcome to English Pod!
[00:05.00]Today we are going to learn about dining at a restaurant.
[00:15.00]Waiter: Good evening, sir. Do you have a reservation?
[00:20.00]Customer: Yes, I have a table for two under the name Smith.
[00:25.00]Waiter: Right this way, please.
[00:30.00]Here are your menus.
[00:35.00]Customer: Thank you. What do you recommend?
[00:40.00]Waiter: Our chef''s special is the grilled salmon.
[00:45.00]Customer: That sounds great. I''ll have that.
[00:50.00]Waiter: And for you, ma''am?
[00:55.00]Customer: I''ll have the vegetable soup and the chicken salad.
[01:00.00]Waiter: Would you like anything to drink?
[01:05.00]Customer: A glass of red wine, please.
[01:10.00]Customer: Could we have some bread as well?
[01:15.00]Waiter: Of course. I''ll be right back.',
'欢迎来到英语播客！
今天我们要学习在餐厅用餐。
服务员：晚上好，先生。您有预订吗？
顾客：是的，我预订了两位，名字是史密斯。
服务员：请这边走。
这是您的菜单。
顾客：谢谢。你推荐什么？
服务员：我们主厨的特色菜是烤三文鱼。
顾客：听起来不错。我要这个。
服务员：女士，您呢？
顾客：我要蔬菜汤和鸡肉沙拉。
服务员：您要喝点什么？
顾客：请给我一杯红酒。
顾客：我们也可以要一些面包吗？
服务员：当然，我马上回来。',
'[00:00.00]Welcome to English Pod!
[00:05.00]Today we are going to learn about dining at a restaurant.
[00:15.00]Waiter: Good evening, sir. Do you have a reservation?
[00:20.00]Customer: Yes, I have a table for two under the name Smith.
[00:25.00]Waiter: Right this way, please.
[00:30.00]Here are your menus.
[00:35.00]Customer: Thank you. What do you recommend?
[00:40.00]Waiter: Our chef''s special is the grilled salmon.
[00:45.00]Customer: That sounds great. I''ll have that.
[00:50.00]Waiter: And for you, ma''am?
[00:55.00]Customer: I''ll have the vegetable soup and the chicken salad.
[01:00.00]Waiter: Would you like anything to drink?
[01:05.00]Customer: A glass of red wine, please.
[01:10.00]Customer: Could we have some bread as well?
[01:15.00]Waiter: Of course. I''ll be right back.',
'[
  {
    "id": "q1",
    "question": "What did the customer order?",
    "options": ["Grilled salmon", "Vegetable soup and chicken salad", "Steak", "Pasta"],
    "correctAnswer": "Grilled salmon",
    "explanation": "根据对话，顾客点了烤三文鱼（grilled salmon）。"
  },
  {
    "id": "q2", 
    "question": "Did the customer have a reservation?",
    "options": ["Yes", "No", "Not mentioned", "They forgot"],
    "correctAnswer": "Yes",
    "explanation": "顾客说：Yes, I have a table for two under the name Smith. 所以他们有预订。"
  },
  {
    "id": "q3",
    "question": "What did the woman order to drink?",
    "options": ["Water", "Red wine", "Coffee", "Tea"],
    "correctAnswer": "Red wine",
    "explanation": "女士说：A glass of red wine, please. 所以她点了红酒。"
  }
]'
);

-- 示例课程2
INSERT OR IGNORE INTO episodes (id, title, difficulty, category, audioPath, transcript, translation, lrc, questions) VALUES
('ep002', 'Job Interview', 'intermediate', 'Career', '',
'[00:00.00]Welcome to English Pod!
[00:05.00]Today we are going to learn about a job interview.
[00:12.00]Interviewer: Please have a seat. Can you tell me about yourself?
[00:18.00]Candidate: Thank you. I graduated from Harvard University.
[00:24.00]I have been working as a software engineer for five years.
[00:30.00]Interviewer: Why do you want to join our company?
[00:36.00]Candidate: Your company is a leader in AI technology.
[00:42.00]I want to be part of your innovative team.
[00:48.00]Interviewer: What are your strengths?
[00:52.00]Candidate: I am good at problem-solving and teamwork.
[00:58.00]I am also very organized and detail-oriented.',
'欢迎来到英语播客！
今天我们要学习求职面试。
面试官：请坐。能介绍一下你自己吗？
候选人：谢谢。我毕业于哈佛大学。
我做了五年软件工程师。
面试官：你为什么想加入我们公司？
候选人：贵公司是AI技术的领导者。
我想成为你们创新团队的一员。
面试官：你有什么优点？
候选人：我擅长解决问题和团队合作。
我做事也有条理，注重细节。',
'',
'[
  {
    "id": "q1",
    "question": "Where did the candidate graduate from?",
    "options": ["Harvard University", "MIT", "Stanford", "Oxford"],
    "correctAnswer": "Harvard University",
    "explanation": "候选人说我毕业于哈佛大学（Harvard University）。"
  },
  {
    "id": "q2",
    "question": "How long has the candidate been working?",
    "options": ["3 years", "5 years", "7 years", "10 years"],
    "correctAnswer": "5 years",
    "explanation": "候选人说我做了五年软件工程师（five years）。"
  },
  {
    "id": "q3",
    "question": "What are the candidate strengths?",
    "options": ["Problem-solving and teamwork", "Sales and marketing", "Design and art", "Writing and speaking"],
    "correctAnswer": "Problem-solving and teamwork",
    "explanation": "候选人说我擅长解决问题（problem-solving）和团队合作（teamwork）。"
  }
]'
);