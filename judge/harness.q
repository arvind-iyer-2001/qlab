/ qlab harness.q
/ Helper functions used by the generated judge script.

/ Safe JSON output to stdout (handle q types that .j.j doesn't like)
.qlab.out:{-1 .j.j x};

/ Run f, catch error, output JSON and exit if it fails
.qlab.safe:{[label;f]
  r:@[f;`;{x}];
  if[10h=type r;  / string = error message from @
    .qlab.out `status`error!(label;"",r);
    exit 0];
  r};

/ Compare two lists element-wise, return first mismatch index or -1
.qlab.firstMismatch:{[expected;actual]
  if[count[expected]<>count[actual];:0];  / length mismatch = first element
  idx:first where not expected~'actual;
  $[null idx;-1;idx]};

/ Format a q value as a readable string for error messages
.qlab.fmt:{.Q.s1 x};
