/ Arvind Travels test generator
/ x is a list of (n;v) pairs: n cities, v tank capacity
/ Seed is set by harness before this file loads

fixed:(
  (4;2);(7;6);(10;3);(12;89);(32;15);(77;1);(2;56);(100;100);(91;14);(56;13));

rand_cases:{(2+rand 99;1+rand 100)} each til 20;

x:fixed,rand_cases;
