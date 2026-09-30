const parseEmailMetadata = (message) => {
    const headers = message.payload?.headers || [];

    const getHeader = (headerName) => {
        const header = headers.find(
            (item) => item.name.toLowerCase() === headerName.toLowerCase()
        );

        return header?.value || "";
    };

    return {
        messageId: message.id,
        threadId: message.threadId,
        sender: getHeader("From"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        labels: message.labelIds || []
    };
};

export default parseEmailMetadata;