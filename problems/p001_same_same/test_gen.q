/ Same-Same test generator
/ Produces x for: \t:1000 func each x
/ Matches the official test generation from the problem statement:
/ a:"23456789TJQKA"; b:?:[?[100;a],'100?"DCHS"]; c:-1_5 cut b; x:(enlist each c 0),'enlist each c -5#til #:[c];

a:"23456789TJQKA";
b:?:[?[100;a],'100?"DCHS"];
c:-1_5 cut b;
x:(enlist each c 0),'enlist each c -5#til #:[c];
