/ Zoolander's Strut test generator
/ x is a list of (cols; rows) pairs, 2 <= cols/rows <= 50
/ Seed is set by harness before this file loads

fixed:((2;2);(3;3);(2;3);(4;4);(4;5);(5;5);(10;10);(20;5);(50;50));
rand_cases:{(2+rand 49;2+rand 49)} each til 10;
x:fixed,rand_cases;
