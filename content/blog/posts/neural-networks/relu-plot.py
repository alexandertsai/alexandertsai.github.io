from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

directory = Path(__file__).resolve().parent
font = directory.parents[3] / "public/fonts/inter/Inter-Regular.ttf"
font_manager.fontManager.addfont(font)
plt.rcParams.update({"font.family": "Inter", "font.size": 11, "svg.fonttype": "path"})

figure, axes = plt.subplots(figsize=(5.6, 3.2), layout="constrained")
inputs = [-3, -2, -1, 0, 1, 2, 3]
axes.plot(inputs, [max(0, value) for value in inputs], color="#245880", linewidth=2.4, zorder=3)
axes.set(xlim=(-3.3, 3.3), ylim=(-0.35, 3.35), xlabel="Input", ylabel="ReLU output")
axes.set_xticks(inputs)
axes.set_yticks([1, 2, 3])
axes.spines[["top", "right"]].set_visible(False)
axes.spines[["bottom", "left"]].set_position("zero")
axes.spines[["bottom", "left"]].set_color("#a5aaae")
axes.tick_params(colors="#666666", length=3, pad=6)
axes.xaxis.set_label_coords(1, -0.02)
axes.xaxis.label.set_horizontalalignment("right")
axes.yaxis.set_label_coords(-0.06, 0.5)
axes.set_axisbelow(True)
axes.yaxis.grid(color="#e9ecee", linewidth=0.6)
figure.savefig(directory / "relu.svg", transparent=True, metadata={"Date": None})
figure.savefig("/tmp/neural-relu-preview.png", dpi=160, facecolor="white")
plt.close(figure)
