"""
╭──────────────────────────────────────────────────────────╮
│  WFGY SDK · Self-Healing Variance Gate for Any LLM       │
│----------------------------------------------------------│
│ 💌  Contact : hello@onestardao.com  /  TG @PSBigBig       │
│ 🌐  Docs    : https://onestardao.com/papers               │
│ 🐙  GitHub  : https://github.com/onestardao/WFGY          │
│                                                          │
│ ★ Star WFGY 1.0 → Unlock 2.0                             │
│   10k ⭐ by **Aug 1st** = next-gen AI alchemy             │
│   Your click = our quantum leap                          │
│                                                          │
│ 🔍  Official PDF of WFGY 1.0 (Zenodo DOI):               │
│     https://doi.org/10.5281/zenodo.15630969              │
│     (Hosted on Zenodo – trusted international archive)   │
│                                                          │
│ 🧬  WFGY BigBang Prompt Pack (v1.0):                     │
│     https://doi.org/10.5281/zenodo.15657016              │
│     (Prompts to trigger the gate; multilingual updates coming) │
│                                                          │
│ 🧠  Hidden folder inside repo: /I_am_not_lizardman        │
│     (X secret papers, wild prompts, and Einstein drama) │
│                                                          │
│ ⚠  GPT-2 demo is just the appetizer. With bigger LLMs,   │
│    WFGY activates variance-drop lasers and KL fireworks. │
│                                                          │
│ 🎮  Bonus: Honest Hero RPG Channel →                     │
│     https://www.youtube.com/@OneStarDao                  │
╰──────────────────────────────────────────────────────────╯
"""
from setuptools import setup, find_packages

setup(
    name="wfgy_sdk",
    version="1.0.0",
    description="WFGY 1.0 • Self-Healing LLM Framework SDK",
    author="PSBigBig",
    author_email="hello@onestardao.com",
    url="https://github.com/onestardao/WFGY",
    packages=find_packages(include=["wfgy_sdk", "wfgy_sdk.*"]),
    python_requires=">=3.10",
    setup_requires=["numpy<2.0"],
    install_requires=[
        "numpy<2.0",
        "torch==2.2.2",
        "transformers==4.41.2",
        "tabulate",
        "matplotlib",
    ],
    entry_points={
        "console_scripts": [
            "wfgy=wfgy_sdk.cli:main",
        ]
    },
)
