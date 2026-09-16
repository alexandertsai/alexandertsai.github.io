---
title: Solving Letterboxed
date: '2024-06-02'
preview: NYT's Letterboxed tackled using rudimentary Python!
---
### A Brief Introduction

I've always loved playing the New York Times games. 
These games have risen significantly in popularity from pre to post pandemic. 
Wordle in particular spiked during the pandemic, becoming a daily discussion
 for many. While these games have been on the slight decline
  (people realised they have better things to do than stay at home and play word games), 
  my love was reinvigorated when I met a few of my friends in school who were still playing them. 
  Ever since then, my daily routine consisted of waiting till 12am to play NYT Strands, Connections and Wordle (yes in that order). 
  It would only be after a weeks of this routine did I discover Letter Boxed. 

### What is Letter Boxed?
Letter Boxed is a game consisting of a 2-dimensional square with 3 letters on each side (12 letters in total). Players must form words by joining one letter from one side of the box to another.
![wreck](./motel.webp)
*Here I formed M-O-T-E-L.*

Letters can't be repeated so "LITTLE" is not allowed. Consecutive letters must 
come from different sides so "PIT" is not allowed either (P and I are on the same side).
After inputting a single word, players can input another that starts with the same letter the previous word ended with.

![knuckle-wreck](./motel-lured.webp)
*After MOTEL, I needed a word that started with an L, so I chose LURED.*

The objective is to use all the letters at least once.

![solved](./solved.webp)
*This is solved!*

### Optimising Letter Boxed 

However, to really impress others, the goal would be to solve it in two words. This is often extremely difficult. Give it a try!
A good trick is to find compound words that utilise many of the letters.

![flowerpot](./flowerpot.webp)
*FLOWERPOT and POWERLIFTER are great words.*

After a good guess, sometimes the second word is immediately clear.
 Sometimes it isn't — leading to lots of headaches and pondering.

### The Idea

There were days when I could not figure out how to solve the puzzle in two words. That's when I came up with the idea of a script. I wanted to design the code so that it didn't immediately solve it, but rather provided some inspiration on what words I could input.

My idea was that I would have a list of all the words in the dictionary. I would then run through the words using certain conditions. For example, the words cannot contain letters not in the box.
![empty](./empty.webp)
*The code should not account for the letter "X" since it isn't in the box.*

Another condition would be that words could not contain sequences of letters adjacent to each other on any side of the box. So "SHOT" would not be allowed as "S" and "H" are next to one another.
### The Journey

The first part (and perhaps the most difficult), was finding a good word repository to reference. There are many online, but a large number either contain invalid words or are missing some words! To test if a word repository was good, I'd usually download the text file and look through some of the words. Some would have several words that weren't even in English... Afterwards, I'd search the word list for the word "Bifurcate". I'm not sure why, but it appears that the quality of a word list often came down to whether it contained this particular word! That is to say, if it contained "Bifurcate", it likely contained other useful words and was comprehensive enough. Eventually, I settled for the 2018 Scrabble word list that contained 220 thousand words.
![google](./google.webp)

After finding the word repository, it was time to write a code! The code I ended up writing was actually fairly simple.
```python
#input the letterbox letters below!
letterstoday = list("uiaocybtrshl")

#input desired letters!
desired = set("y")

#function to remove double letters
def double_letters(word):
    for i in range (len(word)-1):
        if word[i] == word[i+1]:
            return True
    return False
#function to check for first letter of word
def firstletter(word,letter):
    if word[0]==letter:
        return True
    return False
#function to ensure word can be keyed into letterbox (and a subfunc)
def subfunc(dicti,word):
    for i in dicti.keys():
        if word in dicti[i]:
            return i
def keyability(letters,word):
    threedict = {}
    for i in range(0,len(letters),3):
        threedict[i]=[letters[i],letters[i+1],letters[i+2]]
    for i in range(0,len(word)-1):
        if subfunc(threedict,word[i]) == subfunc(threedict,word[i+1]):
            return False
    return True
```

You start off by keying in the letters in the Letterboxed today (in the order they appear around the box, so that the code knows how to determine which letters are on the same side of the box). 
I added a function so that you could input the letters you want in your words. For example, if you wanted to find all the words with "W", you could input W into "desired".

Below the first five lines are a bunch of functions that helps my code run. Some of them ended up unused! For example, I used to use the function double_letters to ignore words that had two letters in a row, such as "GILLS". But I realised that because of this, the code would take an immense amount of time to run each time. To resolve this, I simply ended up editing the original word list by removed all double-lettered words. Below is a separate piece of code I used to edit the text file.
```python
def double_letters(word):
    for i in range (len(word)-1):
        if word[i] == word[i+1]:
            return True
    return False
with open("final.txt", "r") as f:
    lines = f.readlines()
with open("final.txt", "w") as f:
    for line in lines:
        if not double_letters(line):
            f.write(line.lower())
```

"final.txt" here was the name of my 2018 Scrabble repository. This code simply reads through all the words line by line in the text file. If the word does not have double letters, they will be written back into the text file. If not, they will be skipped.
```python
import string
alphabet = set(string.ascii_lowercase)
with open ("final.txt") as file:
    forbiddenletters = alphabet.difference(letterstoday)
    r = []
    for line in file:
        line = line.strip('\n')
        line = line.translate({ord(c): None for c in "-.'"})
        if keyability(letterstoday,line.lower()) and not any(x in forbiddenletters for x in line.lower()) and desired.issubset(line.lower()) and len(line)>5:
            r.append(line)
print(r)
```
This was the main code. "alphabet" was simply all the letters in the alphabet. "forbiddenletters" referred to the letters that could not be inputted into the Letterboxed game. The fourth last line was a very long IF statement utilising numerous conditions to determine if a word should or should not be shown in the final output.

The last line checks if the word can be keyed into the Letterbox, then checks no letters that are forbidden are in the words, then checks if the desired letters are inside and then checks to make sure the word is at least 5 characters long (to prevent an abundance of very short words from appearing).

### An Actual Application
Let's see this in action! Below is today's (07/03/2025) actual Letterboxed puzzle. (I wrote this post a long time ago but had to retake screenshots due to resolution issues)
![actual](./actual.webp)

I start by keying in the letters into "letterstoday". I key in "X" into "desired" since I know the letter "X" is relatively rarer and run the code.
```python
#input the letterbox letters below!
letterstoday = list("loficrtwe")

#input desired letters!
desired = set("x")
```

The output is a long list of words.
```
### output
['coexecutor', 'coexecutors', 'coexert', 'coexerts', 'coexist', 'coexists', 'coxier', 'coxiest', 
'coxitis', 'culexes', 'excels', 'excelsior', 'excelsiors', 'excurse', 'excurses',
'executor', 'executors', 'exerts', 'exfils', 'exiler', 'exilers', 'exiles', 'exilities', 'exists', 'exostoses', 'exostosis', 'extort', 'extorts', 'extrorse', 'fixers', 'fixities', 'fixits', 'fixture', 'fixtures', 'ilexes', 'ixtles', 'lexises', 'lurexes', 'orexis', 'orexises', 'refixes', 'sexers', 'sexier', 'sexiest', 'sexist', 'sexists', 'sextile', 'sextiles', 'sextos', 'sextuor', 'sextuors', 'silexes', 'sixers', 'sixties', 'sorexes', 'ulexes', 'xerosere', 'xeroseres', 'xeroses', 'xerosis', 'xeroxes']

```
The output is a long list of words. Now it's up to me to browse through them and find the best word(s) myself! I try "fixtures".
![fixture](./fixtures.webp)

This guess is pretty lucky! I now finish using "SCOWL".

![solvedagain](./solved2.webp)

### Reflections
I truly had a blast designing this code. It was a process that took around 4-5 days of building and optimising, as well as a lot of frustrated debugging. It was definitely very satisfying upon completion though.

Even though this method probably does not have the optimal O(n) complexity, this is nonetheless something I am proud of.

I do think in some ways, the code has ruined Letterboxed slightly for me. It used to be an incredibly difficult game but now I have code I can always fall back on... I still feel proud when solving it without the code though.

It's been a great journey creating this and I'm excited to continue exploring in the future!
