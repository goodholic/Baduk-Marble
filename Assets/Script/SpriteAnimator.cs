using UnityEngine;

public class SpriteAnimator : MonoBehaviour
{
    public Sprite[] frames;
    public float fps = 4f;

    // 코드 기반 애니메이션
    public bool useProceduralAnim = true;
    public float bobSpeed = 2.5f;     // 위아래 흔들림 속도
    public float bobAmount = 0.08f;   // 위아래 흔들림 크기
    public float breathSpeed = 1.5f;  // 숨쉬기 속도
    public float breathAmount = 0.03f;// 숨쉬기 크기 변화

    private SpriteRenderer sr;
    private Vector3 baseScale;
    private Vector3 basePos;
    private float timeOffset;
    private float frameTimer;
    private int currentFrame;

    void Start()
    {
        sr = GetComponentInChildren<SpriteRenderer>();
        baseScale = transform.localScale;
        basePos = transform.localPosition;
        // 각 캐릭터마다 다른 타이밍으로 움직이도록 랜덤 오프셋
        timeOffset = Random.Range(0f, 10f);
    }

    void Update()
    {
        float t = Time.time + timeOffset;

        // 스프라이트 시트 애니메이션 (프레임이 여러 장이면)
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

        // 코드 기반 자연스러운 애니메이션
        if (useProceduralAnim)
        {
            // 위아래 흔들림 (통통 뛰는 느낌)
            float bobY = Mathf.Sin(t * bobSpeed) * bobAmount;
            transform.localPosition = new Vector3(
                basePos.x,
                basePos.y + bobY,
                basePos.z
            );

            // 숨쉬기 (미세한 스케일 변화)
            float breath = 1f + Mathf.Sin(t * breathSpeed) * breathAmount;
            float squash = 1f - Mathf.Sin(t * bobSpeed * 2f) * breathAmount * 0.5f;
            transform.localScale = new Vector3(
                baseScale.x * breath,
                baseScale.y * squash,
                baseScale.z
            );
        }
    }

    // 외부에서 basePos 업데이트 (네트워크 이동 시)
    public void UpdateBasePosition(Vector3 newPos)
    {
        basePos = newPos;
    }
}
