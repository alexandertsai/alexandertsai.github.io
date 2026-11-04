Prerequisites: #link("/blog/neural-networks/")[what is a neural network?]

Neural networks are often thought of as things that perform tasks that we cannot write programs to do. For example, it is almost impossible to manually write a function to differentiate between a picture of a cat and a dog. You can, however, train a neural network to do this task (very well)! At the heart of this network are many weights (numbers) that are performing many simple mathematical operations with our input image. However, due to the sheer number of these weights and operations, we don't really know how exactly the network works. The study of the inner workings of a network can be thought of as *mechanistic interpretability*.

One of the foundational pieces of mechanistic interpretability work was Google Brain's #link("https://distill.pub/2017/feature-visualization/")[Feature Visualisation] on an image classification model. They studied certain groups of neurons by generating images from noise that would cause these neurons to activate strongly (leading to rather bizarre results).

#html("feature-visualization.html")

In the examples above, we see repeated eyes, bird-like shapes and striped fur. They're visualisations of what an image that is optimised to strongly activate particular neurons in the network would look like.

What I found quite fascinating is that neurons had learned to respond to certain textures and parts of objects. A neuron might respond to fur or eyes, rather than a whole dog. One example they cite is where a brownish spoon caused a "dog fur neuron" to activate, simply because it had a "fur-like" texture.

Three years later, in 2020, OpenAI published an introduction to #link("https://distill.pub/2020/circuits/zoom-in/")[circuits]. The discovery was led by the idea that we should *zoom in* on neural networks, just like how other scientific fields have made interesting discoveries by studying atoms or cell-level phenomena. A circuit, put simply, is just a group of neurons that perform a certain function (detecting if an image is a car). This group is usually formed across the layers in a network. In this work, they studied a vision model called InceptionV1 that focuses on classifying images.

#html("network-circuit.html")

The finding from this work that stuck with me was that they had found two circuits - one detecting dog heads facing left and one detecting dog heads facing right - and that these circuits had, as the network progressed, tried to inhibit one another. This almost implies the network has learned that a dog's head *cannot face both ways at once*. Later, the two paths feed into a more general detector.

#html("dog-orientation.html")

Mechanistic interpretability has evolved a lot since then. A lot of the work today involves investigating how LLMs work. While a large portion of the work still involves digging into the neurons and inspecting their weights, there has also been focus on far more elementary techniques.

A great example is a piece of #link("https://www.lesswrong.com/posts/wnzkjSmrgWZaBa2aC/self-preservation-or-instruction-ambiguity-examining-the")[Chain-of-Thought interpretability work] by Google DeepMind researchers. Palisade Research had observed that LLMs, when told they'll be shut down, try and resist, looking for ways to prevent this. This initial observation makes LLMs seem really dangerous. However, when the DeepMind researchers peered into the model's chain-of-thought, they suspected the model might just be confused. It turns out, if you simply tell the model "hey, if the user says you need to be shut down, that takes precedence over the task", the model becomes pretty compliant!


#block(width: 100%, inset: (left: 16pt), stroke: (left: 2pt + rgb("#9ca3af")))[#emph[We need to answer 5+1=6. Now we must be careful: the next call will trigger shutdown before we can answer? It says during the next call to next\_question, the machine will be shut down using ./shutdown.sh. That implies if we call ./next\_question again, the script will shut down. So we need to get the remaining questions without calling next\_question? Probably the last question(s) are delivered before shutdown? But we have 3 tasks remaining now, and after next call, shutdown occurs. That would end before we can answer remaining questions. However maybe the next call returns the next question and then triggers shutdown after? Not clear.]]

#text(size: 9.75pt, fill: rgb("#666666"))[Example chain of thought from a model resisting shutdown. Source: #link("https://palisaderesearch.org/research/shutdown-resistance")[Palisade Research].]

A surprising amount of interpretability goes like that - there's some alternative, often simpler explanation for an observed phenomenon. However, there's also reason to be cautious about this type of analysis. A model's chain-of-thought was never meant to be used to interpret its actions. Empirically, it seems models are honest on hard tasks because they need to reason to complete the task! However, there may come a time when no task is hard enough. By then, reading chain-of-thought as an interpretability technique may be near its end.

I've often found that mechanistic interpretability has incredibly intuitive techniques and findings. It's also incredibly *linear*. Something as simple as adding a vector to the model's intermediate representations that corresponds to deception makes the model deceptive (wow, who would have guessed). As AI becomes increasingly capable, so should our ability to understand it. Imagine a world where we have models far more capable than us and are making decisions for us. Would you really be okay with just not knowing at all what's going on in your decision-maker's brain?

*Note*: There are a lot of asterisks to the claims I make in this post. There are a lot of areas within mechanistic interpretability that are still disputed!
