/ Ritul's Tabs reference solution — Ritul Bhoj's correct solution (problem setter).
/ Key insight: closing every k-th tab from position b removes exactly one residue class mod k.
/ There are k residue classes; pick the one whose removal maximises |remaining sum|.

func:{k:x 0;x:x 1;i:(til count x)mod k;s:k#0;s[i]+:x;max abs sum[x]-s}
