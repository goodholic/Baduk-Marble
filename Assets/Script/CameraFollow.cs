using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [Header("카메라 설정")]
    public Transform target; // 따라갈 대상 (나의 캐릭터)
    
    // 인스펙터에 노출되지만, Start()에서 강제로 값을 덮어씌웁니다.
    public Vector3 offset;

    void Start()
    {
        // [핵심 수정] 유니티 에디터 인스펙터에 예전 값(예: -4)이 남아있어서
        // 캐릭터가 화면 아래로 쏠리는 현상을 방지합니다.
        // 무조건 카메라가 캐릭터의 정중앙(0, 0)을 비추도록 코드로 강제 초기화합니다.
        offset = new Vector3(0f, 0f, -10f);
    }

    void LateUpdate()
    {
        // 타겟이 설정되지 않았다면 작동하지 않음
        if (target == null)
            return;

        // 카메라 위치를 타겟 위치 + 오프셋으로 직접 설정하여 지연 없이 따라갑니다.
        Vector3 desiredPosition = target.position + offset;
        
        // 카메라 위치 즉시 적용 (화면 정중앙 배치)
        transform.position = desiredPosition;
    }

    // 외부(GameManager 등)에서 타겟을 지정해줄 때 사용하는 함수
    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }
}