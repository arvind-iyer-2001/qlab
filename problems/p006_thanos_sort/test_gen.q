/ Thanos Sort test generator
/ x is a list of (n; array) pairs. n is a power of 2 in 1..16.
/ Seed is set by harness before this file loads.

fixed:(
  (4; 1 2 2 4);
  (8; 11 12 1 2 13 14 3 4);
  (4; 7 6 5 4);
  (16; 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16);
  (8; 73 97 9 72 82 69 8 86);
  (16; 27 45 6 19 19 25 25 34 36 44 52 55 83 90 96 90);
  (16; 12 90 29 33 9 54 32 45 64 88 98 32 81 23 70 17));

mk:{n:1 2 4 8 16 rand 5;(n;1+n?100)};
rand_cases:mk each til 30;

x:fixed,rand_cases;
