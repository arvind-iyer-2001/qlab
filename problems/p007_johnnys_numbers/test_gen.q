/ Johnny's Three Numbers test generator
/ x is a list of 4-element lists. Each entry is a shuffled (a+b; a+c; b+c; a+b+c).
/ Seed is set by harness before this file loads.

fixed:(
  3 6 5 4;
  40 40 40 60;
  201 101 101 200;
  1000000000 666666667 666666667 666666666;
  600000000 900000000 500000000 1000000000;
  2 2 3 2;
  500000000 500000001 999999999 1000000000);

/ Generate a random case: pick a,b,c in [1, ~3.3e8] so a+b+c <= 1e9.
mk:{a:1+rand 333333333;b:1+rand 333333333;c:1+rand 333333333;
    v:(a+b;a+c;b+c;a+b+c);
    v iasc 4?1000};
rand_cases:mk each til 40;

x:fixed,rand_cases;
