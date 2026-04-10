using UnityEngine;

/// <summary>
/// 4방향(상하좌우) 스프라이트 애니메이션 시스템
/// 임진록/거상 스타일: 방향별 다른 스프라이트 + 걷기 프레임
///
/// 스프라이트시트 레이아웃 (행=방향, 열=프레임):
///   Row 0: 하(Down)  - 기본 정면
///   Row 1: 좌(Left)
///   Row 2: 우(Right)
///   Row 3: 상(Up)    - 뒤통수
/// 각 행에 walkFrames장의 걷기 프레임 + idle 1장 (첫 프레임)
/// </summary>
public class SpriteAnimator : MonoBehaviour
{
    [Header("Legacy (단일 방향)")]
    public Sprite[] frames;          // 이전 호환: 단방향 프레임
    public float fps = 6f;

    [Header("4방향 스프라이트")]
    public Sprite[] downSprites;     // 하(정면) 프레임들
    public Sprite[] leftSprites;     // 좌 프레임들
    public Sprite[] rightSprites;    // 우 프레임들
    public Sprite[] upSprites;       // 상(뒤) 프레임들

    [Header("설정")]
    public bool use4Direction = false; // true면 4방향 시스템 사용
    public float walkFps = 6f;         // 걷기 애니메이션 속도
    public float idleBreathScale = 0.02f; // 숨쉬기 스케일 강도

    // 현재 상태
    private SpriteRenderer sr;
    private float timeOffset;
    private float frameTimer;
    private int currentFrame;
    private Vector3 baseScale;

    // 4방향 상태
    public enum Direction { Down = 0, Left = 1, Right = 2, Up = 3 }
    private Direction currentDir = Direction.Down;
    private bool isMoving = false;
    private Sprite[] currentDirSprites;

    void Start()
    {
        sr = GetComponentInChildren<SpriteRenderer>();
        baseScale = transform.localScale;
        timeOffset = Random.Range(0f, 10f);

        if (use4Direction && downSprites != null && downSprites.Length > 0)
            currentDirSprites = downSprites;
    }

    void Update()
    {
        if (sr == null) return;

        if (use4Direction && currentDirSprites != null && currentDirSprites.Length > 0)
        {
            Update4Direction();
        }
        else if (frames != null && frames.Length > 1)
        {
            // Legacy 단방향 애니메이션
            frameTimer += Time.deltaTime;
            if (frameTimer >= 1f / fps)
            {
                frameTimer = 0f;
                currentFrame = (currentFrame + 1) % frames.Length;
                sr.sprite = frames[currentFrame];
            }
        }

        // 숨쉬기 스케일 (대기 상태에서만)
        if (!isMoving)
        {
            float t = Time.time + timeOffset;
            float breath = 1f + Mathf.Sin(t * 1.5f) * idleBreathScale;
            transform.localScale = new Vector3(baseScale.x * breath, baseScale.y * breath, baseScale.z);
        }
        else
        {
            transform.localScale = baseScale;
        }
    }

    private void Update4Direction()
    {
        if (isMoving)
        {
            // 걷기 애니메이션
            frameTimer += Time.deltaTime;
            if (frameTimer >= 1f / walkFps)
            {
                frameTimer = 0f;
                currentFrame = (currentFrame + 1) % currentDirSprites.Length;
                sr.sprite = currentDirSprites[currentFrame];
            }
        }
        else
        {
            // 대기: 첫 프레임(idle)
            if (currentDirSprites.Length > 0)
                sr.sprite = currentDirSprites[0];
            currentFrame = 0;
            frameTimer = 0f;
        }
    }

    /// <summary>
    /// 이동 방향 설정 (GameManager에서 호출)
    /// </summary>
    public void SetDirection(float dx, float dy)
    {
        if (!use4Direction) return;

        bool wasMoving = isMoving;
        isMoving = (Mathf.Abs(dx) > 0.01f || Mathf.Abs(dy) > 0.01f);

        if (!isMoving) return;

        Direction newDir;
        // 상하가 우선 (대각선일 때 상하로 판정)
        if (Mathf.Abs(dy) >= Mathf.Abs(dx))
            newDir = dy > 0 ? Direction.Up : Direction.Down;
        else
            newDir = dx > 0 ? Direction.Right : Direction.Left;

        if (newDir != currentDir || !wasMoving)
        {
            currentDir = newDir;
            switch (currentDir)
            {
                case Direction.Down:  currentDirSprites = downSprites; break;
                case Direction.Left:  currentDirSprites = leftSprites; break;
                case Direction.Right: currentDirSprites = rightSprites; break;
                case Direction.Up:    currentDirSprites = upSprites; break;
            }

            // 좌우 미러링: leftSprites가 없으면 rightSprites를 flipX로 대체
            if (currentDirSprites == null || currentDirSprites.Length == 0)
            {
                if (currentDir == Direction.Left && rightSprites != null && rightSprites.Length > 0)
                {
                    currentDirSprites = rightSprites;
                    sr.flipX = true;
                }
                else if (currentDir == Direction.Right && leftSprites != null && leftSprites.Length > 0)
                {
                    currentDirSprites = leftSprites;
                    sr.flipX = true;
                }
                else
                {
                    // fallback: 아무 방향이나
                    currentDirSprites = downSprites ?? frames;
                    sr.flipX = false;
                }
            }
            else
            {
                sr.flipX = false;
            }

            currentFrame = 0;
            frameTimer = 0f;
        }
    }

    /// <summary>
    /// 이동 중지 (GameManager에서 호출)
    /// </summary>
    public void SetIdle()
    {
        isMoving = false;
    }

    /// <summary>
    /// 현재 방향 가져오기
    /// </summary>
    public Direction GetDirection() => currentDir;
}
