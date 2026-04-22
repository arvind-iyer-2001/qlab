/ Brogan's Badges test generator
/ x is a list of (n; k) pairs — friends count and sheets per notebook
/ Seed is set by harness before this file loads

fixed:((3;5);(15;6);(1;1);(100000000;1);(1;100000000);(96865066;63740710);(58064619;65614207));
rand_cases:{(1+rand 100000000;1+rand 100000000)} each til 8;
x:fixed,rand_cases;
