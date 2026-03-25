using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [Header("카메라 설정")]
    public Transform target; // 따라갈 대상 (나의 캐릭터)
    
    // 2D 뷰에 맞게 카메라 위치 조정 (x, y는 따라가고, z는 뒤로 고정)
    // 플레이어가 화면 중앙에 오도록 오프셋을 설정합니다.
    public Vector3 offset = new Vector3(0f, 0f, -10f); 
    
    // "화면의 중간"에 완벽하게 고정하기 위해 smoothSpeed 변수는 제거합니다.
    // public float smoothSpeed = 5f; 

    void LateUpdate()
    {
        // 타겟이 설정되지 않았다면 작동하지 않음
        if (target == null)
            return;

        // "화면의 중간"에 위치시키기 위해 Lerp를 제거하고 즉시 이동합니다.
        // 카메라의 위치를 타겟 위치 + 오프셋으로 직접 설정하여 지연 없이 따라갑니다.
        Vector3 desiredPosition = target.position + offset;
        
        // 카메라 위치 즉시 적용
        transform.position = desiredPosition;
        
        // 2D 시점이므로 LookAt 회전은 사용하지 않습니다. 
        // 카메라는 항상 Z축을 정면으로 바라보게 세팅해두시면 됩니다.
    }

    // 외부(GameManager 등)에서 타겟을 지정해줄 때 사용하는 함수
    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }
}