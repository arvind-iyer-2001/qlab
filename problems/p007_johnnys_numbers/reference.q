/ Johnny's Three Numbers reference solution (Ritul Bhoj — 17 chars)
/ max is a+b+c; remove it, then subtract the other 3 values from max.

func:{m-(x _ x?m:max x)}
