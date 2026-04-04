using UnityEngine;

public class SpriteAnimator : MonoBehaviour
{
    public Sprite[] frames;
    public float fps = 4f;

    private SpriteRenderer sr;
    private float timer;
    private int currentFrame;

    void Start()
    {
        sr = GetComponentInChildren<SpriteRenderer>();
    }

    void Update()
    {
        if (frames == null || frames.Length <= 1 || sr == null) return;

        timer += Time.deltaTime;
        if (timer >= 1f / fps)
        {
            timer = 0f;
            currentFrame = (currentFrame + 1) % frames.Length;
            sr.sprite = frames[currentFrame];
        }
    }
}
