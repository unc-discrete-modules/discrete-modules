---
title: Induction
video_url: https://www.youtube.com/watch?v=IFNhAR9LVUw
---

## (Strong) Induction

- Induction is a type of proof we can do on recursively defined functions and sets
- Say we are trying to prove $R(x)$ holds in a recursively defined set $S = \{S_0, S_1, S_2, \ldots \}$
- We can prove this by:
    1. Showing $R(x)$ holds for the base case(s) of $S$
    2. Assuming $R(k)$ holds for all $k < n$ in the recursive rule, showing that it also holds for step $n$.
    In other words, we're showing $\big(R(S_0) \land R(S_1) \land \ldots \land R(S_{n-2}) \land R(S_{n-1})\big) \implies R(S_{n})$.
- Remember that many things can be defined recursively, so even though $x \in S$, $x$ isn't necessarily a single element. $x$ can also be a set/function/mapping etc! Think about our recursive powersets definition.

## Let's Start With an Example

Recall the Fibonacci series...

- The base case: $F(0) = 0, F(1) = 1$
- Recursive rule: For $n > 1$, $F(n) = F(n-1) + F(n-2)$.

We want to prove the following about the sum of the first $n$ numbers of the series:

$\forall n \in \mathbb{N}, F(0) + F(1) + F(2) + \ldots + F(n-1) + F(n) = F(n+2) - 1$.

## Example with Template

### S1. State the ‘for all’ statement that you want to prove:

- $\forall n \in \mathbb{N}, \sum_{i=0}^n F(i) = F(n+2) - 1$.

### S2. Say “we prove this by induction on” and state the induction parameter.

- We prove this by induction on $n$.

## Example with Template

### S3. Prove the base case(s).

- $n=0$:
    - $F(0) = F(2) - 1$
    - $0 = 0$ $\square$
- $n = 1$:
    - $F(0) + F(1) = F(3) - 1$
    - $1 = 2 - 1$ $\square$

## Example with Template

### S4. Write Induction Step.

- For a given $n > 1$,

### S5. State the Induction Hypothesis (IH)

- I can assume for all $1 \leq k \leq n$ that $\sum_{i=0}^k F(i) = F(k+2) - 1$,
(First line)

### S6. State what you are going to prove about your specific value of $x$ that was given to you in S4:

- and I want to prove $\sum_{i=0}^n F(i) = F(n+2) - 1$. (Last line)

## Example with Template

### S7. Do the proof for the specific $x$.

| 1. $\forall 1 \leq k \leq n, {} \sum_{i=0}^k F(i) = F(k+2) - 1$   | IH |
| -------- | -------- |
| 2. Let  $k = n - 1$,  then  $\sum_{i=0}^{n-1} F(i) = F(n-1+2) - 1$  | Applied IH |
| 3. $\sum_{i=0}^{n-1} F(i) = F(n+1) - 1$   | Rewrote Line 2 |
| 4. $\sum_{i=0}^{n-1} F(i) + F(n) = F(n+1) - 1 + F(n)$   | Added  $F(n)$ to both sides. |
| 5. $F(n+2) = F(n+1) + F(n)$   | Fibonacci Def. |
| 6. $\sum_{i=0}^{n-1} F(i) + F(n) = F(n+2) - 1$   | Plugged 5. into 4. |
| 7. $\sum_{i=0}^n F(i) = \sum_{i=0}^{n-1} F(i) + F(n)$   | Def. of Sum |
| 8.  $\sum_{i=0}^{n} F(i) = F(n+2) - 1$   | Plugged 7. into 6. $\square$ |

## Example with Template

### S8. Declare victory.

- Therefore, we have proved $\forall n \in \mathbb{N}, F(0) + F(1) + F(2) + \ldots + F(n-1) + F(n) = F(n+2) - 1$.

## Tips for Proving Something by Induction (S7)

- Your Inductive Hypothesis (Step 5) should be line 1 in your proof.
- The recursive definition of any structures you're using (e.g. sum, factorial, exponents, etc.) should be the next lines of your proof.
- Step 6 is what the *last* line of your proof should be.
- To start, think about how you can use your inductive hypothesis and recursive definitions to get to step 6. (Usually this means plugging a smaller version of $x$ into your inductive hypothesis and using your recursive definitions to rewrite it.)
