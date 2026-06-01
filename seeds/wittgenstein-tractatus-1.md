---
slug: wittgenstein-tractatus-1
title: 비트겐슈타인 — 논리철학논고 §1
author: 루트비히 비트겐슈타인 (Ludwig Wittgenstein)
era: 1921
field: 철학
axis_focus: cognitive
axis_weights:
  cognition: 5
  value: 3
  time: 2
target_nodes:
  - 세계 (Welt)
  - 사실 (Tatsache)
  - 사물 (Ding)
  - 사태 (Sachverhalt) — 사실의 가능성
  - 일어남 (Fall sein)
  - 사실들의 총체 (Gesamtheit der Tatsachen)
  - 사물들의 총체가 아님 (nicht der Dinge)
trap_concepts:
  - 세계 = 사물들의 합 (가장 흔한 오독 — 비트겐슈타인이 *명시적으로 거부*)
  - 사실 = 외부 객체의 발생 (사실은 *명제로 표현 가능한 상태*)
  - 사태와 사실의 혼동 (사태는 *가능태*, 사실은 *현실태*)
status: cold_start_draft
---

# Text Body

## 원문 (독일어, 1921 — public domain)

```
1   Die Welt ist alles, was der Fall ist.
1.1 Die Welt ist die Gesamtheit der Tatsachen, nicht der Dinge.
1.11 Die Welt ist durch die Tatsachen bestimmt und dadurch,
     dass es alle Tatsachen sind.
1.12 Denn, die Gesamtheit der Tatsachen bestimmt, was der Fall ist
     und auch, was alles nicht der Fall ist.
1.13 Die Tatsachen im logischen Raum sind die Welt.
1.2  Die Welt zerfällt in Tatsachen.
1.21 Eines kann der Fall sein oder nicht der Fall sein und alles
     übrige gleich bleiben.
```

## 한국어 (cold-start 번역)

1   세계는 일어나는 모든 것이다.
1.1 세계는 사실들의 총체이지, 사물들의 총체가 아니다.
1.11 세계는 사실들에 의해 그리고 *그것이 모든 사실들이라는 점*에 의해 결정된다.
1.12 사실들의 총체는 *무엇이 일어나는가* 와 *무엇이 일어나지 않는가* 를 모두 결정한다.
1.13 논리적 공간 안의 사실들이 세계다.
1.2 세계는 사실들로 분해된다.
1.21 어떤 하나의 일은 일어날 수도 있고 일어나지 않을 수도 있다 — 나머지는 그대로인 채.

# 인지 구조 cold-start 분석

## 인지 축 (cognition)
- **세계의 새 정의**: 세계 = *사물들의 모음*이 아니라 *사실들의 모음*. 인지의 기본 단위를 *사물*에서 *명제로 표현 가능한 관계*로 옮긴다.
- **번호의 위계 (1, 1.1, 1.11, 1.12 …)**: 비트겐슈타인은 문장 번호 자체로 *논리적 위계*를 표현한다. 1은 본문, 1.1은 1에 대한 보충, 1.11은 1.1에 대한 보충. 인지가 *목차로 시각화된* 자리.
- **논리적 공간 (logischer Raum)**: 사실은 *어떤 공간 안의* 사실. 그 공간은 *가능한 사실들의 좌표계*. 인지가 *현실*과 *가능* 둘을 동시에 다룬다.
- **부정의 위치**: "무엇이 일어나지 않는가" 도 *사실*에 의해 결정된다. 인지가 *없는 것까지* 정의의 영역에 포함.

## 가치 축 (value)
- **언어의 한계 = 세계의 한계**: 후속 §5.6 "내 언어의 한계는 내 세계의 한계다" 와 연결되는 자리. 가치가 *말할 수 있는 것*과 *말할 수 없는 것*의 경계에 산다.
- **사물에서 관계로**: 가치의 대상이 *물건*이 아니라 *관계*다. 한 물건의 가치가 아니라 *그 물건이 다른 것들과 맺는 관계*의 가치.

## 시간 축 (time)
- **시간 약함 (axis_weights time=2)**: 논고 §1 자체는 *논리적 구조*를 다루지 시간을 다루지 않는다.
- **다만 1.21 의 시간적 함의**: 한 사실이 *일어나거나 일어나지 않거나*는 동시에 결정되지 않을 수 있다 — 시간이 *사실의 발생 순간*을 가른다. 후속 §2의 사태(Sachverhalt) 논의와 연결.

# 학습자에게 던질 질문 (튜터 초안)

1. "세계는 사물들의 총체가 아니라 사실들의 총체다" — 이 *부정형* 정의가 일상에 적용된다면? *책장 = 책들의 모음* 이 아니라 *책장 = 책들의 관계들의 모음* 으로 본다면 무엇이 바뀌는가?
2. 번호 위계 (1 → 1.1 → 1.11 → 1.12) 를 노드 그래프로 그린다면 어떤 모양인가? 평면 그래프인가, 깊이 있는 트리인가?
3. "일어나지 않는 것"도 사실에 의해 정의된다. 일상의 한 자리에서 *일어나지 않는 사실*이 의미를 만드는 예를 찾아보라 (예: 친구가 답장하지 않음 = 사실 vs 사물?).
4. 비트겐슈타인은 *명제(命題)*가 사실의 *그림(Bild)*이라고 후속에서 말한다 (§2.1). 명제를 *그림*으로 보는 인지와, 명제를 *기호*로 보는 인지는 어떻게 다른가?
