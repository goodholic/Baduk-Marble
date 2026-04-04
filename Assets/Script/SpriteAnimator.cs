using UnityEngine;

public class SpriteAnimator : MonoBehaviour
{
    public Sprite[] frames;
    public float fps = 4f;

    private SpriteRenderer sr;
    private float timeOffset;
    private float frameTimer;
    private int currentFrame;
    private Vector3 baseScale;

    void Start()
    {
        sr = GetComponentInChildren<SpriteRenderer>();
        baseScale = transform.localScale;
        timeOffset = Random.Range(0f, 10f);
    }

    void Update()
    {
        // 프레임 애니메이션
        if (frames != null && frames.Length > 1 && sr != null)
        {
            frameTimer += Time.deltaTime;
            if (frameTimer >= 1f / fps)
            {
                frameTimer = 0f;
                currentFrame = (currentFrame + 1) % frames.Length;
                sr.sprite = frames[currentFrame];
            }
        }

        // 숨쉬기 스케일만 (위치 변경 없음 → HP바 안정)
        float t = Time.time + timeOffset;
        float breath = 1f + Mathf.Sin(t * 1.5f) * 0.02f;
        transform.localScale = new Vector3(baseScale.x * breath, baseScale.y * breath, baseScale.z);
    }
}
