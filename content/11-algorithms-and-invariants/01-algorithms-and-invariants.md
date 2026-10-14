---
title: Algorithms and Invariants
video_url: https://www.youtube.com/watch?v=EG_7lK18XDk
---

## Algorithms

Input is data given to an algorithm

An algorithm is a series of steps

An algorithm returns some result

An algorithm may be influenced by its environment and it may  produce side-effects which influence its environment.

![An algorithm takes input, produces output, and sits inside an environment](images/alg.png)

## What you will learn

- How to come up with an algorithm to solve a given problem
- How to express that algorithm in pseudocode
- What you can *say* about the algorithm (e.g. what kind of guarantees you can make about the outcome, how long it takes, etc.)

## Example: Finding the Lowest Card in a Deck

![Four playing cards: 5 of spades, 2 of hearts, 3 of spades, 5 of hearts](images/card-alg/cards.png)

## Example: Finding the Lowest Card in a Deck

![The four cards with an arrow under the first card](images/card-alg/cards1.png)

Low card: ![5 of spades](images/card-alg/card-5.png)

## Example: Finding the Lowest Card in a Deck

![The four cards with an arrow under the first card](images/card-alg/cards1.png)

5 < 5?

Low card: ![5 of spades](images/card-alg/card-5.png)

## Example: Finding the Lowest Card in a Deck

![The four cards with an arrow under the second card](images/card-alg/cards2.png)

2 < 5?

Low card: ![2 of hearts](images/card-alg/card-2.png)

## Example: Finding the Lowest Card in a Deck

![The four cards with an arrow under the third card](images/card-alg/cards3.png)

3 < 2?

Low card: ![2 of hearts](images/card-alg/card-2.png)

## Example: Finding the Lowest Card in a Deck

![The four cards with an arrow under the fourth card](images/card-alg/cards4.png)

5 < 2?

Low card: ![2 of hearts](images/card-alg/card-2.png)

## Pseudocode (Over a list)

Returning smallest *element*

```
INPUT my_list: list
min = my_list[0]
FOR element in my_list:
    IF element < min:
        min = element
RETURN min
```

## Pseudocode (Over a list)

Returning *index* of smallest element

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

## Invariants

* An invariant is a statement that is true during all steps of a procedure.

* In other words, your invariant should be true at Step 0, Step 1, and Step 1000 of your algorithm.

* If the invariant holds for an arbitrary step of your algorithm, this means it'll always hold! (What does that sound like?)

* If the invariant always holds, this means that it'll hold at the last step, which tells us something about our output!

## Example

```
INPUT my_list: list
min = my_list[0]
FOR element in my_list:
    IF element < min:
        min = element
RETURN min
```

My algorithm takes as input list `A`

and outputs: `min` $\in \mathbb{Z}$

such that: $\forall$ `elem` $\in$ `A`, `min` $\leq$ `elem`

## Example

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

My algorithm takes as input list `A`

and outputs: `min_idx` $\in [0,$ `len(A)`$-1]$

such that:

$\forall$ `j` $\in [0,$ `len(A)`$-1]$, `A[min_idx]` $\leq$ `A[j]`

## Invariants

An invariant says something about your algorithm at every step of execution, not just at output.

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

Every time you start a new iteration in your for loop, the invariant updates.

## Invariants

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

My algorithm takes as input list `A`

and behaves such that: $\forall i \in [0,$ `len(A)`$-1]$

there exists:  `min_idx` $\in [0,i-1]$,

such that:
$\forall$ `j` $\in [0, i-1]$, `A[min_idx]` $\leq$ `A[j]`

## Invariants

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

![Array a0 to a(n-1): base case, i = 1](images/invariants/invariant-bc.png)

My algorithm takes as input list `A`

and behaves such that: $\forall i \in [0,$ `len(A)`$-1]$

there exists:  `min_idx` $\in [0,i-1]$,

such that:
$\forall$ `j` $\in [0, i-1]$, `A[min_idx]` $\leq$ `A[j]`

## Invariants

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

![Array a0 to a(n-1): i = 2](images/invariants/invariant-cs2.png)

My algorithm takes as input list `A`

and behaves such that: $\forall i \in [0,$ `len(A)`$-1]$

there exists:  `min_idx` $\in [0,i-1]$,

such that:
$\forall$ `j` $\in [0, i-1]$, `A[min_idx]` $\leq$ `A[j]`

## Invariants

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

![Array a0 to a(n-1): i = n - 1](images/invariants/invariant-n-1.png)

My algorithm takes as input list `A`

and behaves such that: $\forall i \in [0,$ `len(A)`$-1]$

there exists:  `min_idx` $\in [0,i-1]$,

such that:
$\forall$ `j` $\in [0, i-1]$, `A[min_idx]` $\leq$ `A[j]`

## Invariants

```
INPUT my_list: list
n = LENGTH(my_list)
min_idx = 0
FOR index in [0,n-1]:
    IF my_list[index] < my_list[min_idx]:
        min_idx = index
RETURN min_idx
```

![Array a0 to a(n-1): i = n](images/invariants/invariant-n.png)

My algorithm takes as input list `A`

and behaves such that: $\forall i \in [0,$ `len(A)`$-1]$

there exists:  `min_idx` $\in [0,i-1]$,

such that:
$\forall$ `j` $\in [0, i-1]$, `A[min_idx]` $\leq$ `A[j]`
