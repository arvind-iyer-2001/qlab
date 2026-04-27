/ Arvind Travels reference solution
/ Prices are strictly increasing (city i costs $i), so always fill to max
/ at each city until you have enough fuel to reach city n.
/ Closed-form: cost = v + sum(2..n-v)  when v < n-1, else cost = n-1

func:{[x]n:x 0;v:x 1;m:n-v;$[v>=n-1;n-1;v+((m*m+1)div 2)-1]}
