Imagine you've just come back from volunteering at a pet shelter. Your camera gallery is filled with images of dogs and cats.

#html("camera-gallery.html")

You want to organise it and place cats in one album and dogs in another, but you've taken too many photos. You think back to your Introduction to Python class and try to write a Python script to do this. Pretty soon, you realise each image is too complex, and there isn't any reasonable function you could write to differentiate a dog from a cat.

This is where *neural networks* come in! They can be thought of as really intelligent programs that can perform tasks human-written code cannot (must note: there are also many tasks where simply writing code would be much better, e.g. mathematical operations).

To understand what a neural network is, let's start with a simpler task. Let's say I have an 8×8 black-and-white photo (64 pixels in total). I want to determine if it's a smiling face or a frowning one.

#html("faces-pixels.html")

To represent images in a more computer-friendly form, let's try to represent this *numerically* too. Let's say if the pixel is black, it's a 0. And if it's white, then it's a 1!

#html("faces-binary.html")

Now we've got a list of 64 numbers (read left to right, row by row). For the happy face, this list starts with $[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, dots]$ and ends with eight zeros.

For my next trick, I'll do something radical. What if, WHAT IF we initialised two lists of length 64 filled with a bunch of random numbers?

#html("weight-lists.html")

And what if we then multiplied our 64 pixel numbers [0, 0, 0, …] element-wise by each list and added all of that up? For example, the first number in the pixel list gets multiplied by 1.2, the second one gets multiplied by −0.9, the third one gets multiplied by 0.3 and so on, till the 64th number. Then we repeat for the second random list. First multiply 0 (from the pixel list) by 0.5 (from the random list), and so on...

#html("weighted-sum.html")

#html("weighted-sum-2.html")

So we'd get $0 times 1.2 + 0 times (-0.9) + 0 times 0.3 + dots + 0 times 0.2$, which sums up to 1.5 for random list 1. Repeating the same process with random list 2 gives us −0.2. And now, what if we just add these two numbers together and say, if this result is above zero, it's a smiling face? And if it's zero or below, it's gotta be a frowning one?

This incredibly arbitrary operation of multiplying and summing is essentially what a neural network is! (Yes, we skipped a lot of details, but ignore that for now.) What's almost magical is (a) how well these simple operations can work when trained on a bunch of data and (b) the myriad of things they can do. It just works!

One way to think about *why* we'd even do this in the first place is as follows: imagine you have a bunch of numbers (the pixels in the image) that you know must contain some information about the fact this is a smiling face. You just have no idea how to extract that information. Well, maybe instead of trying to write manual rules, you'll just have some kind of "network" extract it for you. Your hope is that, with enough training data, these random numbers will kinda improve and capture the complexity for you. You might not know how it does it, but as long as it works, that's fine.

Now, I did mention we skipped past a few things. One thing I can't afford to skip is how neural networks introduce non-linearity (this is how they get so good at magic tasks). A common example is a function called *ReLU* (rectified linear unit). After we get our weighted sum from random list 1 (1.5), we pass that sum through a simple function that says: "If your result is less than zero, then I will modify it to zero. Otherwise, if you're already greater than or equal to zero, you're good." So, for example, our sum of 1.5 stays 1.5. List 2 has a sum of −0.2, so it becomes 0. After applying ReLU, now we sum up the numbers again ($1.5 + 0 = 1.5$).

#figure(
  image("relu.svg", width: 80%, alt: "ReLU graph: makes any negative input zero. Everything else stays the same!"),
  caption: [ReLU(x) = max(0, x)],
  numbering: none,
)

The other thing I skipped is how these networks are trained. How do we know the random numbers we are multiplying by are indeed the right numbers to classify images? They use something called *backpropagation*. The math behind this process is not impossible, but it is frankly pretty long-winded and took me a while to wrap my head around when I first learnt it.

A simplified version is as such: you have the prediction that your neural network makes, e.g. this image is a smiling face. You also have the truth, e.g. this image is *actually* a frowning face! If your neural network very confidently says, "Nope, this guy is smiling", the neural network is punished like crazy with a large error (we call this the *loss*) and we use that error to adjust its *weights* (the things we multiply each number by, e.g. 1.2, −0.9, 0.3). Backpropagation helps us calculate how to adjust those weights, and *gradient descent* makes the updates. If the neural network confidently gets it right, the error is much less and we don't change weights much. This is pretty intuitive! If you're constantly getting things wrong as a network, we need to change you. If you're already getting things right, we probably shouldn't alter your values too much.

#text(size: 9.75pt, fill: rgb("#666666"))[*Technical note:* Backpropagation calculates how the loss changes with each weight. An optimiser such as gradient descent uses those gradients to update the weights.]

#html("recap-quiz.html")

Below is what our example network would look like in a diagram. There are 64 neurons in the first layer - our *input layer*, where we input the pixel information. There are 2 neurons in what we call the *hidden layer*. That's where our ReLU function would live. The last neuron is our *output layer*, where we classify the image as a smile or frown.

#html("network-diagram.html")

Real networks often take in far larger inputs and are much larger in size. Sufficiently large networks can perform our actual (and far more complex) dog vs cat classification task really well. All we do is increase the number of neurons in the hidden layer, increase the number of input neurons (so we can input higher-resolution images), and maybe add another hidden layer. To deal with images that have colour that can't be represented by 0s and 1s, you can actually convert the image to a greyscale one, and say: bright pixels we'll represent as 1, and dark pixels we'll represent as 0. Grey-ish pixels can be represented somewhere in between (e.g. 0.7).

#html("input-recap.html")

On the lowest level, it's really just bits and pieces of math! Today, these neural networks power most of the magical things we see around us. Self-driving cars, ChatGPT, bots in video games, and much more. In the next couple of blog posts, I'd like to talk a bit more about how we can actually understand these networks, and what other cool areas they get applied in.

*Note*: This article has skipped over lots of technical details for the sake of understandability. Please do not use this for interview preparation.
