using UnityEngine;

public class SpriteAnimator : MonoBehaviour
{
    public Sprite[] frames;
    public float fps = 4f;
    public float breathSpeed = 1.5f;
    public float breathAmount = 0.03f;

    private SpriteRenderer sr;
    private Transform visualChild;
    private float timeOffset;
    private float frameTimer;
    private int currentFrame;
    private Vector3 baseScale;

    void Start()
    {
        sr = GetComponentInChildren<SpriteRenderer>();
        timeOffset = Random.Range(0f, 10f);

        // 스프라이트를 자식 오브젝트로 분리 (HP바에 영향 안 주도록)
        if (sr != null && sr.transform == transform)
        {
            // SpriteRenderer가 본체에 있으면 자식으로 이동
            GameObject visual = new GameObject("Visual");
            visual.transform.SetParent(transform, false);
            visual.transform.localPosition = Vector3.zero;

            SpriteRenderer newSR = visual.AddComponent<SpriteRenderer>();
            newSR.sprite = sr.sprite;
            newSR.color = sr.color;
            newSR.sortingOrder = sr.sortingOrder;
            newSR.material = sr.material;

            Destroy(sr);
            sr = newSR;
            visualChild = visual.transform;
        }
        else if (sr != null)
        {
            visualChild = sr.transform;
        }

        baseScale = visualChild != null ? visualChild.localScale : Vector3.one;
    }

    void Update()
    {
        float t = Time.time + timeOffset;

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

        // 시각 효과 (자식 오브젝트만 움직임 → HP바 영향 없음)
        if (visualChild != null)
        {
            // 위아래 흔들림 (스프라이트만)
            float bobY = Mathf.Sin(t * 2.5f) * 0.06f;
            visualChild.localPosition = new Vector3(0, bobY, 0);

            // 숨쉬기 (스케일)
            float breath = 1f + Mathf.Sin(t * breathSpeed) * breathAmount;
            visualChild.localScale = new Vector3(baseScale.x * breath, baseScale.y * breath, baseScale.z);
        }
    }
}
