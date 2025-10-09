---
date: "2025-10-09"
---

Today the same line of code that had been working for the past two weeks gave me an error. It turns out that sometimes the platform I run code on gets updated, and something must have changed in the previous update because now it no longer worked. The error was something like:

Permission Denied: /var/lib...

After a lot of failed debugging, what ended up fixing it was the rather naive solution of `sudo chmod 777 /var/lib...`. Strangely running this in the terminal it didn't have any effect. Instead I had to use a bang (`!sudo chmod...`) within the Jupyter Notebook for it to work.
