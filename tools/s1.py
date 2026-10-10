pg.evaluate("ENC.state.mode='single'")
for t in [1,4,7,9.5,12]:
    pg.evaluate(f"ENC.seek(0,{t})"); pg.screenshot(path=f"/tmp/ui_{t}.png")
print(pg.evaluate("ENC.stage.errors"))
