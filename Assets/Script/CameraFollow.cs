using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [Header("카메라 설정")]
    public Transform target; // 따라갈 대상 (나의 캐릭터)
    
    // 탑다운 뷰에 맞게 카메라 위치 조정 (y: 높이, z: 뒤로 물러나는 거리)
    public Vector3 offset = new Vector3(0f, 15f, -10f); 
    
    // 카메라 이동 부드러움 정도 (숫자가 클수록 더 빨리 따라감)
    public float smoothSpeed = 5f; 

    void LateUpdate()
    {
        // 타겟이 설정되지 않았다면 작동하지 않음
        if (target == null)
            return;

        // 카메라가 이동해야 할 목표 위치 계산
        Vector3 desiredPosition = target.position + offset;
        
        // 현재 위치에서 목표 위치로 부드럽게 이동 (Lerp 사용)
        Vector3 smoothedPosition = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
        
        // 카메라 위치 적용
        transform.position = smoothedPosition;

        // 카메라가 항상 플레이어를 내려다보도록 회전 설정
        transform.LookAt(target.position);
    }

    // 외부(GameManager 등)에서 타겟을 지정해줄 때 사용하는 함수
    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }
}