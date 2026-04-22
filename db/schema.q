/ qlab schema.q
/ Run with: q db/schema.q -p 5000
/ The Python API connects via pykx AsyncQConnection.

/ ---- Table definitions ----

submissions:([]
  id          :`long$();
  problem_id  :`long$();
  user_id     :`long$();
  handle      :`$();
  language    :`$();
  code        :`$();
  char_count  :`long$();
  status      :`$();          / `correct`wrong`error`timeout`invalid
  timing_ms   :`long$();
  submitted_at:`timestamp$();
  error_msg   :`$()
 );

/ ---- Disk persistence ----
/ .z.f is a file sym like `:/home/aiyer/qlab/db/schema.q when invoked as: q db/schema.q

/ .z.f is a symbol like `/home/aiyer/qlab/db/schema.q
/ string .z.f gives /home/aiyer/qlab/db/schema.q — take everything before last slash
path:string .z.f;
DB_DIR:path til last where"/"=path;         / -> /home/aiyer/qlab/db
DATA_DIR:DB_DIR,"/data";                    / -> /home/aiyer/qlab/db/data
SUB_FILE:hsym`$":",DATA_DIR,"/submissions"; / -> `:/home/aiyer/qlab/db/data/submissions

/ Ensure data directory exists
system"mkdir -p ",DATA_DIR;

/ Load saved data on startup if it exists
@[{submissions::get SUB_FILE};`;{}];
-1"qlab db: ",string[count submissions]," submissions loaded";

/ Save to disk on clean exit
.z.exit:{
  SUB_FILE set submissions;
  -1"qlab db: saved ",string[count submissions]," submissions";
  };

/ ---- IPC API functions ----

/ Insert a new submission, return its id
.db.insertSubmission:{[sub]
  id:1+max 0,submissions`id;
  sub[`id]:id;
  sub[`submitted_at]:.z.p;
  `submissions insert sub;
  / Persist immediately — don't wait for clean exit
  SUB_FILE set submissions;
  id
  };

/ Leaderboard: correct submissions ranked by timing_ms then char_count
.db.leaderboard:{[problem_id;lim]
  r:select from submissions where problem_id=problem_id,status=`correct;
  r:`timing_ms`char_count xasc r;
  lim sublist r
  };

/ Count of correct submissions for a problem
.db.solveCount:{[problem_id]
  count select from submissions where problem_id=problem_id,status=`correct
  };

/ ---- Ready ----
-1"qlab db ready on port ",string system"p";
