Something I've been working on for a while is detecting AI-generated content (AIGC), especially images! It's clear that scam cases (love scams, general scams) and fraud abuse (fake IDs, refund abuse) have seen a surge since the inception of generative AI. This was something I worked on for almost a year at TikTok within the e-commerce risk control department.

As a quick overview of the field, we currently have five primary methods of detecting AI-generated images.

1. *Training-free methods*: attempt to reconstruct the images with some type of model. If there is a high reconstruction error, the image is likely real. Else, it is probably fake. Most of these methods do not work that well in production.

2. *Foundation models*: We pass the image into some type of foundation model (DINOv3) and utilise the embedding for classification purposes.

3. *VLMs*: One popular (rather unsuccessful) attempt is to perform RL on QwenX-VL to reason about which image is real or fake.

4. *Spatial and Frequency Approaches*: These approaches focus on more pixel-level statistics (e.g. upsampling patterns from latent-diffusion models) or perform some operation on the image in the frequency domain.

5. *Watermarking*: A decently robust approach that more model providers have begun to adopt.

#html("detection-patterns.html")

What's really interesting is that the focus of the field from 2024 to 2026 has shifted between all of these approaches. As generative models evolved from GANs and Stable Diffusion to more autoregressive approaches, and now further towards more complex architectures, so have the approaches used to detect them.

The current consensus in the field seems to be that the task isn't impossible, but it is extraordinarily difficult to make approaches that are robust and generalise well. I like to think of it as three parts:

*Generalisation*: If I train my model on gpt-image-2 today, and OpenAI releases gpt-image-2.5 tomorrow, will my model still work?

*Robustness to post-processing*: Does my model still work after the image has been compressed or distorted heavily?

*Interpretability*: Even if my model says this image is fake, how do I *really* know that it's fake? Should I just trust it?

#figure(
  image("sae-features.jpg", width: 100%, alt: "Twelve generated photos of skincare bottles and tubes with misspelled labels such as Gentel Wash and Cleasnr, grouped by one sparse autoencoder feature."),
  caption: [Using sparse autoencoders to detect skincare products with garbled label text.],
  numbering: none,
)

If you read through many of the papers currently published on AIGC detection, they typically do not deal well with generalisation or robustness, and many do not focus on interpretability at all. Part of this can be attributed to the flawed design of a few benchmarks in the first place. In #link("https://arxiv.org/html/2403.17608v2")[Fake or JPEG?], they explain that most real images tend to be JPEG, while fake images are PNGs (generative models output PNGs by default). Since PNGs are lossless and are far more detailed, models could learn shortcuts such as "more detailed" = "fake", which isn't necessarily true.

Fortunately, the robustness problem can be somewhat solved pretty simply by practising good data hygiene (augmenting training data). Even so, recall often falls towards the lower side under very high JPEG compression. Generalisation is less simple. There haven't really been great solutions for this.

Another issue is that even with powerful watermarking technology, there are several ways to remove watermarks. One way is to pass the image generated into an open-source model and tell the model "Do not change anything about this image. Simply output it as it is." You could also tell it to make a very slight change, e.g. "make the window slightly brighter". This removes the watermark very effectively. As it turns out, most image editing models do not actually only edit one particular part of the image, but rather regenerate the entire image!

When I think about the future of AI detection, it seems to me to be a field that will just never really be solved. There will always need to be some level of compute dedicated to this issue, continuously retraining on larger and more powerful models. This is something that I've been working on for a while and that I really care about. Feel free to visit the #link("/")[home page] of my website and contact me if you're interested in this too!

#figure(
  image("poster.webp", width: 60%, alt: "Alexander standing beside his poster, Reviewing AI Image Detection and Interpretation, and pointing at it."),
  caption: [Me presenting my AIGC detection poster at the AIM Intelligence Safety Conference!],
  numbering: none,
)
