---
title: Propositional Logic
video_url: https://www.youtube.com/watch?v=Jf7lZ_LQ5FM
---

## Learning Objectives

-  Express statements in symbolic form, using the logic operations of negation, and, inclusive or, implies, if and only if (iff), and exclusive or (and their symbols: $\neg, \land, \lor, \rightarrow, \leftrightarrow,$ and $\oplus$) to express statements without ambiguity.
-  Create truth tables in order to recognize *tautologies* and *logically equivalent* expressions, including De Morgan’s rules and conditional expressions.
-  Demonstrate how to use these methods to solve a logic puzzle.

## Propositions and Basic Operations

A *proposition* is a sentence to which one and only one of the terms $True$ or $False$ can be applied.

Which of the following are propositions?

-  We are currently in Chapel Hill.  — **Yes**
-  $1 + 1 = 2$   — **Yes**
-  $2 + x = 4$  — **No**
-  It is hot outside.  — **No**

## Negation

A *Truth Table* for negation would look like the following:

$$
\begin{array}{|c|c|}
\hline
p  & \neg p  \\
\hline
T & F \\
F & T \\
\hline
\end{array}
$$

What this is saying is:

"When $p$ is $True$, $\neg p$ is $False$,

and when $p$ is $False$, $\neg p$ is $True$."

Here is an example of a negated proposition:

-  $p$: "Today is Monday.''
-  $\neg p$: "Today is not Monday.''
-  *ALTERNATIVELY:* $\neg p$: "It is not the case that today is Monday.''

## Conjunction

A Truth Table for conjunction would look like the following:

$$
\begin{array}{|c|c|c|}
\hline
p  & q & p \land q  \\
\hline
T & T & T \\
T & F & F \\
F & T & F \\
F & F & F \\
\hline
\end{array}
$$

Here is an example of conjunction:

-  $p$: "It is sunny today.''
-  $q$: "It is Monday.''
-  $p \land q$: "It is sunny today and today is Monday.''

The conjunction ($p \land q$) is $True$ on sunny Mondays, but it is $False$ on any non-sunny day ($p$ is $False$), and it is $False$ on any day that is not Monday ($q$ is $False$).

## Disjunction

A Truth Table for disjunction would look like the following:

$$
\begin{array}{|c|c|c|}
\hline
p  & q & p \lor q  \\
\hline
T & T & T \\
T & F & T \\
F & T & T \\
F & F & F \\
\hline
\end{array}
$$

Here is an example of disjunction.

-  $p$: "It is sunny today.''
-  $q$: "It is Monday.''
-  $p \lor q$: "It is sunny today or today is Monday.''

The disjunction ($p \lor q$) is $True$ on sunny Mondays, on any sunny day ($p$ is $True$), and on any Monday ($q$ is $True$). It is $False$ on any day where it is both not sunny and not Monday.

## Exclusive Or

A Truth Table for exclusive or would look like the following:

$$
\begin{array}{|c|c|c|}
\hline
p  & q& p \oplus q  \\
\hline
T & T & F \\
T & F & T \\
F & T & T \\
F & F & F \\
\hline
\end{array}
$$

Here is an example of exclusive or.

-  $p$: "It is sunny today.''
-  $q$: "It is Monday.''
-  $p \oplus q$: "It is sunny today or today is Monday, but not both.''

The exclusive or ($p \oplus q$) is $True$ on any sunny day ($p$ is $True$) and on any Monday ($q$ is $True$), EXCEPT for on sunny Mondays (both $p$ and $q$ are $True$). Additionally, it is $False$ on any day where it is both not sunny and not Monday.

## Conditionals

The *conditional statement* $p \rightarrow q$ is False when $p$ is $True$ and $q$ is $False$, and True otherwise.

$p$ is called the hypothesis and $q$ the conclusion.

This can also be called *implication*.

Some English phrases for this would be:

-  If $p$, then $q$.
-  $p$ implies $q$.
-  $q$ if $p$.

A Truth Table for implication would look like the following:

$$
\begin{array}{|c|c|c|}
\hline
p  & q & p \rightarrow q  \\
\hline
T & T & T \\
T & F & F \\
F & T & T \\
F & F & T \\
\hline
\end{array}
$$

## Conditionals Continued

A Truth Table for implication would look like the following:

$$
\begin{array}{|c|c|c|}
\hline
p  & q & p \rightarrow q  \\
\hline
T & T & T \\
T & F & F \\
F & T & T \\
F & F & T \\
\hline
\end{array}
$$

Here is an example of implication.

-  $p$: "It is sunny.''
-  $q$: "I walk to campus.''
-  $p \rightarrow q$: "If it is sunny, then I walk to campus.''

The implication $p \rightarrow q$ is $False$ if it is sunny and I do NOT walk to campus. Otherwise, it is $True$.

If it is not sunny ($p$ is $False$) and I still walk to campus ($q$ is $True$) this implication is still $True$.

## Biconditionals

The *biconditional statement* ("if and only if" or "iff") $p \leftrightarrow q$ is $True$ when $p$ and $q$ have the same truth value, and $False$ otherwise.

A Truth Table for a biconditional would look like the following:

$$
\begin{array}{|c|c|c|}
\hline
p  & q & p \leftrightarrow q  \\
\hline
T & T & T \\
T & F & F \\
F & T & F \\
F & F & T \\
\hline
\end{array}
$$

Here is an example of a biconditional.

-  $p$: "It is sunny.''
-  $q$: "I walk to campus.''
-  $q \leftrightarrow p$: "I walk to campus if and only if it is sunny.''

The biconditional ($p \leftrightarrow q$) is $True$ if it is sunny and I walk to campus or if it is not sunny and I don't walk to campus. Otherwise, it is $False$.

Unlike the previous example, if it is not sunny ($p$ is $False$) and I still walk to campus ($q$ is $True$), this biconditional is $False$.

## Order Of Operations
- Negations: $\neg$
- Conjunctions: $\land$
- Disjunctions: $\lor$

Everything else can be written as a combination of the above three, but in general, it's best to always clarify order of operations using parentheses!

## Logical Equivalences

Logical expressions that result in the same truth values are considered *logical equivalences*.

- Example: One useful equivalence is *DeMorgan's Law*. It states:

$$\neg (p \land q) \equiv \neg p \lor \neg q$$
$$ \neg (p \lor q) \equiv \neg p \land \neg q $$

## Proving Equivalences

Logical Equivalences can be proven two different ways:

1. Using Truth Tables
2. Directly, using other logical equivalences

## Common Logical Equivalences

| Name of Law | Formula |
| -------- | -------- |
| Commutative Laws | $p \lor q \equiv q \lor p$|
| | $p \land q\equiv q \land p$|
| Associative Laws | $(p \lor  q) \lor r \equiv  p \lor  (q \lor  r)$|
| |$(p \land q) \land r\equiv p \land  (q \land  r)$|
|Distributive Laws | $p \land  (q \lor  r) \equiv  (p \land  q ) \lor  (p \land  r)$|
| | $p \lor  (q \land  r) \equiv  (p \lor  q) \land (p \lor r)$|

## More Common Logical Equivalences

| Name of Law | Formula |
| -------- | -------- |
| Identity Laws | $p \lor  F\equiv p$|
| | $p \land  T \equiv p$ |
| Negation Laws | $p \land \neg p \equiv F$|
| | $p\lor \neg p\equiv T$|
|Idempotent Laws | $p \lor  p \equiv p$|
| | $p\land p \equiv p$|

## More Common Logical Equivalences
| Name of Law | Formula |
| -------- | -------- |
|Domination Laws | $p \land F \equiv F$|
| | $p \lor  T \equiv T$|
|Absorption Laws| $p \land (p\lor  q)\equiv p$|
| | $p \lor  (p \land  q) \equiv  p$|
|Double Negation Law |$\neg (\neg p)\equiv p$|
|Implication | $p \implies q \equiv \neg p \lor q$|

## Proving Equivalences Using Truth Tables
We can prove the first part of DeMorgan's Law
($\neg (p \land q) \equiv \neg p \lor \neg q$) using a truth table.

| $p$ | $q$ | $\neg p$ | $\neg q$ | $p \land q$ | $\neg(p \land q)$ | $\neg p \lor \neg q$ |
| --- | --- | --- | --- | --- | --- | --- |
| $T$ | $T$ | $F$ | $F$ | $T$ | $F$ | $F$ |
| $T$ | $F$ | $F$ | $T$ | $F$ | $T$ | $T$ |
| $F$ | $T$ | $T$ | $F$ | $F$ | $T$ | $T$ |
| $F$ | $F$ | $T$ | $T$ | $F$ | $T$ | $T$ |

The columns for $\neg(p \land q)$ and $\neg p \lor \neg q$ are equal, so this means $\neg(p \land q)$ and $\neg p \lor \neg q$ are *logically equivalent*!

## Proving Equivalences Using Logical Equivalences

Prove $(a \land \neg b) \rightarrow c \equiv \neg a \lor b \lor c$ directly using existing logical equivalences.

$$
\begin{aligned}
&\textbf{Equivalence} ~~~~ &\textbf{Rule Used}& \\
&(a \land \neg b) \rightarrow c &\textbf{Given}& \\
&\equiv \neg (a \land \neg b) \lor c &\textbf{Implication} \\
&\equiv  \neg a \lor \neg \neg b \lor c  &\textbf{DeMorgan's} \\
&\equiv \neg a \lor b \lor c  &\textbf{Double Negation}\\
\end{aligned}
$$

## Other Considerations

- A truth table computes all possible combinations of $n$ propositions, so a truth table always has how many rows?

propositions = $\{p\}$

truth values = $\{True, False\}$

Truth table:

$$
\begin{array}{|c|}
\hline
p    \\
\hline
T  \\
F \\
\hline
\end{array}
$$

2 rows...

## Other Considerations

- A truth table computes all possible combinations of $n$ propositions, so a truth table always has how many rows?

propositions = $\{p, q\}$

truth values = $\{True, False\}$

Truth table:

$$
\begin{array}{|c|c|}
\hline
p  & q  \\
\hline
T & T \\
T & F \\
F & T \\
F & F \\
\hline
\end{array}
$$

4 rows...

## Other Considerations

- A truth table computes all possible combinations of $n$ propositions, so a truth table always has how many rows?

propositions = $\{p,q,...\}$ $\leftarrow$ $n$ propositions

truth values = $\{True, False\}$

$2^n$ rows!

## Tautologies
-  Notice that a combination of propositions using operators (e.g. $p \land q$ makes a new proposition. These can also be called *compound propositions*.
-  A compound proposition with a truth table where all the values in the last column are $True$ is called a *tautology*.
- An example of this is $p \lor \neg p$.

$$
\begin{array}{|c|c|c|}
\hline
p  & \neg p & p \lor \neg p  \\
\hline
T & F & T \\
F & T & T \\
\hline
\end{array}
$$

For all values, $p \lor \neg p$ evaluates to $True$!

## Translating English Sentences
To translate logic to and from English sentences, it is important to know the common phrases for the operators.

-  $\neg p$ (Negation): "not $p$"
-  $p \land q$ (Conjunction): "$p$ and $q$"
-  $p \lor q$ (Disjunction): "$p$ or $q$"
-  $p \oplus q$ (Exclusive Or): "$p$ xor $q$"; "$p$ or $q$, but not both"
-  $p \rightarrow q$ (Conditional/Implication): "$p$ implies $q$"; "if $p$ then $q$"; "$q$ if $p$"
-  $p \leftrightarrow q$ or $p$ iff $q$ (Biconditional): "$p$ if and only if $q$"

## Translating English Sentences

Here's an example of breaking up an English language sentence.

- Start with the sentence: "You cannot ride the roller coaster if you are under 4 feet tall.''
- Then, you break your sentence to the smallest propositions possible.
- $a$ = "You can ride the roller coaster''
- $b$ = "you are under 4 feet tall''
- Now your sentence is: Not $a$ if $b$.
- So you know you can write it as: $b \rightarrow \neg a$.
- Notes:
    - If it doesn't directly match any of the phrases listed, use truth tables to see what it matches.
    - Sometimes it takes a little experimenting/practice
