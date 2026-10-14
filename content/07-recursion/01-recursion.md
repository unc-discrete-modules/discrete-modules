---
title: Recursion
video_url: https://www.youtube.com/watch?v=TTBgV6I2ubQ
---

## What is recursion?

**Recursion** is the idea of solving a problem by breaking it into smaller problems.

A **recursive function** evaluates by calling itself.

###  Why do we use recursion?

- Breaking a problem into smaller pieces can make it easier to solve.
- Breaking a problem into smaller pieces can also make it easier to reason about, making it easier to prove properties about it!
- Many programming languages heavily rely on recursive definitions (haskell, racket, scheme, etc.)
- Other programming languages support it by letting a function call itself.

## Defining a Function Recursively: Example

Any function can be redefined recursively!

### Example

- Standard definition: $f(n) = n$

- Recursive Definition:
$f(0) = 0$  (Base Case)

$f(n) = f(n-1) + 1$  (Recursive Rule)

## Defining a Function Recursively With Code

### Standard Definition

    FUNCTION f:
      INPUT n: int
      RETURN n

### Recursive Definition

    FUNCTION f:
      INPUT n: int
      IF n == 0:
        RETURN 0
      ELSE:
        RETURN f(n-1) + 1

### Another Example - Factorials:

- A familiar function we know is $n! = n \cdot$  $(n-1) \cdot \ldots \cdot 2 \cdot 1$

- We can rewrite this as $n! = n\cdot (n-1)!$

- This is a **recursive** definition because we are computing $n!$ by first computing $(n-1)!$

> The base case: $1! = 1$
>
> The recursive rule: $n! = n \cdot (n-1)!$

## Recursive Definitions

We just gave an example of functions that are defined recursively.

You can also recursively define sets, relations, tuples, lists, sequences, etc...

Every definition has the two same components:

#### **The base case:**

  - the initial element/value of what you're trying to define (often smallest)
  - where recursion *ends*
  - prevents infinite loops/definitions!

#### **The recursive rule:**

- tells you how to generate the next element/value given previous ones
- expresses definition in terms of smaller components

## The Fibonacci numbers

- The Fibonacci numbers are a very famous *sequence* of numbers that are defined via a recursive function.

1. The base case: $F(0) = 0, F(1) = 1$
2. Recursive rule: For $n > 1$, $F(n) = F(n-1) + F(n-2)$.

> So, $F(2) = F(1) + F(0) = 0 + 1 = 1$
>

> $F(3) = F(2) + F(1) = 1 + 1 = 2$
>

> The sequence: $0, 1, 1, 2, 3, 5, \ldots$

## Other Example - Powersets:

- We can define powersets recursively:
- $\mathscr{P}(X + \{c\} ) = \mathscr{P}(X) \cup (\mathscr{P}(X) + \{c\})$
- E.g. $\mathscr{P}(\{1,2,3\}) = \mathscr{P}(\{1,2\} + \{3\}) = \mathscr{P}(\{1,2\}) \cup (\mathscr{P}(\{1,2\}) + \{3\})$
- This is essentially saying we can build a powerset by unioning two smaller sets. We are building something by combining two smaller things. That's what makes this definition **recursive**.

### Definition

1. The base case: $\mathscr{P}(\{ \}) = \{\}$
2. The recursive rule: $\mathscr{P}(X + \{c\}) = \mathscr{P}(X) \cup (\mathscr{P}(X) + \{c\})$

## Defining Lists Recursively

- We are going to give an example of how we can define a list and some functions on a list recursively
- Say all elements of our list are in set $A$
- The set of all possible lists $L$ can be defined as $L = \bigcup_{k\geq0}A^k$
(Aka all possible permutations of length $k \geq 0$ of the elements in $A$.)
- We can also define this recursively.
- You may have seen this before--these are called **linked lists!**

1. Base case: Empty list $\langle ~ \rangle$
2. Recursive rule: For any element $a \in A$ and all lists $l \in L$, $cons(a,l)$ is a list in $L$.

- Basically, $cons(a,l)$ takes $a$ and attaches it to list $l$
- You can think of "$cons$" as short for "constructor".

## Defining Lists Recursively

1. Base case: Empty list $\langle ~ \rangle$

2. Recursive rule: For any element $a \in A$ and all lists $l \in L$, $cons(a,l)$ is a list in $L$.

- Basically, $cons(a,l)$ takes $a$ and attaches it to list $l$

### Examples

- $\langle b \rangle = cons(b, \langle ~ \rangle)$
- $\langle$ $a$ $, b \rangle =$ $cons(a,$ $cons(b, \langle ~ \rangle)$$)$

## Useful Partial Functions

- $head(cons( a,l )) = a$
- $tail(cons( a,l )) = l$
- Note that $head$ returns an element and $tail$ returns a list!

### Examples

- $\langle a, b, c \rangle$ = $cons(a, cons(b, cons(c, \langle ~ \rangle)))$
- $head($  $cons(a, cons(b, cons(c, \langle ~ \rangle)))$  $) = a$

- $tail($ $cons(a,$  $cons(b, cons(c, \langle ~ \rangle)))$$)$
$= cons(b, cons(c, \langle ~ \rangle)) = \langle b, c \rangle$

## Strings and Languages: A Note

- Strings and Languages are likely going to come up later in your computer science education, so it's good to be familiar with these definitions!
- A **string** is a list containing characters from a given **alphabet** $\Sigma$
- The set of all possible strings that can be made from an alphabet is $\Sigma^*$
- A **language** is a set of strings $L \subseteq \Sigma^*$
