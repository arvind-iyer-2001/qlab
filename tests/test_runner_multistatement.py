from api.services.runner import (
    _split_top_level_statements,
    _build_run_script,
)


# --- statement splitting ---

def test_single_line_statements_split_individually():
    lines = ["a:1", "b:2", "a+b"]
    assert _split_top_level_statements(lines) == ["a:1", "b:2", "a+b"]


def test_multiline_brace_block_stays_one_statement():
    lines = ["g:{", "  x*2", "  }", "g 21"]
    stmts = _split_top_level_statements(lines)
    assert stmts == ["g:{\n  x*2\n  }", "g 21"]


def test_closing_brace_at_column_zero_groups():
    lines = ["helper:{[x]", "x+1", "}", "helper 41"]
    stmts = _split_top_level_statements(lines)
    assert stmts == ["helper:{[x]\nx+1\n}", "helper 41"]


def test_brace_inside_string_is_ignored():
    lines = ['s:"a}b"', "count s"]
    assert _split_top_level_statements(lines) == ['s:"a}b"', "count s"]


def test_inline_comment_brace_ignored():
    lines = ["a:1  / a brace } in a comment", "a"]
    assert _split_top_level_statements(lines) == ["a:1  / a brace } in a comment", "a"]


# --- script building ---

def test_build_emits_one_value_call_per_body_statement():
    script = _build_run_script("a:1\nb:2\na+b")
    # two body statements (a:1, b:2) -> two @[value;...] calls
    assert script.count("@[value;") == 2
    assert ".Q.s1 value" in script  # final expression formatted


def test_build_returns_none_for_empty():
    assert _build_run_script("\n  \n") is None


def test_build_groups_multiline_func_before_final_call():
    # helper def (multi-line, brace at col 0) + a separate final call — the
    # case a single joined `value` could not run. One body statement -> one
    # @[value;...] call, plus the formatted final expression.
    script = _build_run_script("f:{[x]\n  x*2\n  }\nf 21")
    assert script.count("@[value;") == 1
    assert ".Q.s1 value" in script
