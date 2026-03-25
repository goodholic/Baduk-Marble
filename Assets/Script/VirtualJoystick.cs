using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class VirtualJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
{
    [Header("조이스틱 UI 연결")]
    public Image backgroundImage; // 조이스틱 배경 동그라미
    public Image joystickImage;   // 움직이는 핸들 동그라미

    // GameManager에서 참조하는 변수 복구 (에러 해결)
    public Vector2 InputVector { get; private set; }

    private void Start()
    {
        if (backgroundImage == null) backgroundImage = GetComponent<Image>();
        if (joystickImage == null) joystickImage = transform.GetChild(0).GetComponent<Image>();

        // [추가된 로직] 조이스틱을 화면 하단 중앙으로 강제 배치하여 캐릭터와 겹치지 않게 합니다.
        RectTransform rect = backgroundImage.rectTransform;
        rect.anchorMin = new Vector2(0.5f, 0f);
        rect.anchorMax = new Vector2(0.5f, 0f);
        rect.pivot = new Vector2(0.5f, 0f);
        // 하단에서 100 픽셀만큼 띄워서 배치 (필요시 100f 값을 조절하세요)
        rect.anchoredPosition = new Vector2(0f, 100f); 
    }

    public void OnDrag(PointerEventData eventData)
    {
        Vector2 pos;
        if (RectTransformUtility.ScreenPointToLocalPointInRectangle(backgroundImage.rectTransform, eventData.position, eventData.pressEventCamera, out pos))
        {
            // 좌표 정규화 (-1 ~ 1)
            pos.x = (pos.x / (backgroundImage.rectTransform.sizeDelta.x / 2));
            pos.y = (pos.y / (backgroundImage.rectTransform.sizeDelta.y / 2));

            InputVector = new Vector2(pos.x, pos.y);
            InputVector = (InputVector.magnitude > 1.0f) ? InputVector.normalized : InputVector;

            // 핸들 이미지 이동
            joystickImage.rectTransform.anchoredPosition = new Vector2(
                InputVector.x * (backgroundImage.rectTransform.sizeDelta.x / 2),
                InputVector.y * (backgroundImage.rectTransform.sizeDelta.y / 2));
        }
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        OnDrag(eventData);
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        // 터치 종료 시 초기화
        InputVector = Vector2.zero;
        joystickImage.rectTransform.anchoredPosition = Vector2.zero;
    }
}