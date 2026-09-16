So yesterday I accidentally deleted my entire HDFS drive. For context, every person has their own little directory where they can store their stuff in:

`global_path/users/alexander.tsai/all_other_folders`

And I was clearing out some folders that I didn't need any more by running `!hdfs dfs -rm` commands within a notebook. Before I realised it, I had accidentally:

`rm -r global_path/users/alexander.tsai`

Don't even ask me HOW I accidentally ran that command. I think I meant to `ls` but obviously I did not do that. As you might know, this command removes (rm) all folders inside this directory recursively (-r). In simple terms it deletes everything. I think people always make jokes about the intern deleting the entire database but I had seriously done it now. Like I couldn't fathom how could you possibly accidentally delete everything but today I finally get it. Literally as I ran that command I realised what I had done and I tried to press the interrupt button in Jupyter but it just happened too fast...

What followed was a message saying that everything in my directory had been moved to another directory (.Trash) or something. I wasn't super super panicked by this point because I was like "okay, at least it still exists". But now I had to figure out how to move it back into the right place. Just to confirm, I tried to access my folder again with:

`ls global_path/users/alexander.tsai`

Which gave me an error, saying that folder doesn't exist. Now I started to get a tiny bit worried... Then I tried to

`mkdir global_path/users/alexander.tsai`

But it gave me a GDPR error, essentially meaning I lacked the permissions to do so. Now I was KINDA worried. For context, the way it works is that you can create as many directories as you want inside your own directory (alexander.tsai) but you can't create new directories at the /users level. But I can't begin to make any directories within alexander.tsai if it doesn't exist. At this point I'm sitting there in the canteen, while my intern friends are having their lunch, oblivious to the horror of what had just occurred, while I am having my mini panic moment.

Anyway so I sit there and run a couple more ls and mkdir commands just to try and figure anything out but it's futile. At this point I'm like scratching my head, looking around, thinking what to tell my boss... then it hits me. A WAVE of GENIUS washes across me. I begin to formulate my thoughts, almost typing hesitantly, as if unsure if it'll work, but feeling some level of faith. I go:

`mkdir -p global_path/users/alexander.tsai/test`

Kaboom. I check with ls and my directory is back. So! Short explanation. The `-p` flag creates any directories in the specified path if they don't exist. Since I knew I didn't have permission to create alexander.tsai directly, I would work around this by creating a directory within that directory, and that would automatically create alexander.tsai! And it actually worked :') Then I just did a simple:

`mv .Trash/path/to/trash global_path/users/alexander.tsai`

And that is the story of how I accidentally deleted my entire HDFS but fixed it. Okay have a good day please do not `rm -r` without 三思而行!
